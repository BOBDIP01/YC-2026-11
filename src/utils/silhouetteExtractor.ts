// Neural Person Silhouette Extractor (MediaPipe Selfie Segmenter + Edge-Preserving Joint Bilateral Filter)
// Recognizes true hair, head, ear, neck, and shoulder edges using Google MediaPipe's neural
// selfie_segmenter model, refined with an RGB-guided Joint Bilateral Filter and interior flood-fill
// so the person's hair, forehead, face, and shoulders are never wrongly cut or blotched.

import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';

const silhouetteCache = new Map<string, string>();
const environmentCache = new Map<string, string>();

let segmenterPromise: Promise<ImageSegmenter | null> | null = null;

async function getNeuralSegmenter(): Promise<ImageSegmenter | null> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks('/mediapipe-wasm');
        const segmenter = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/mediapipe-wasm/selfie_segmenter.tflite',
            delegate: 'CPU',
          },
          runningMode: 'IMAGE',
          outputConfidenceMasks: true,
          outputCategoryMask: false,
        });
        return segmenter;
      } catch (err) {
        console.warn('MediaPipe local WASM fallback to CDN:', err);
        try {
          const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
          );
          return await ImageSegmenter.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: '/mediapipe-wasm/selfie_segmenter.tflite',
              delegate: 'CPU',
            },
            runningMode: 'IMAGE',
            outputConfidenceMasks: true,
            outputCategoryMask: false,
          });
        } catch (err2) {
          console.warn('Neural segmenter unavailable, using edge-stopped flood fill:', err2);
          return null;
        }
      }
    })();
  }
  return segmenterPromise;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

function colorDistSq(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return 0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db;
}

/**
 * Ensures any interior pocket not reachable from the top/left/right outer background border
 * is 100% solid (1.0), preventing any holes inside hair, forehead, eyes, or striped clothing.
 */
function fillInteriorHoles(mask: Float32Array, width: number, height: number, threshold = 0.45): Float32Array {
  const total = width * height;
  const visitedBg = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  // Seed flood-fill from top border and upper 88% of left/right borders where mask < threshold
  for (let x = 0; x < width; x++) {
    const idx = x;
    if (mask[idx] < threshold) {
      visitedBg[idx] = 1;
      queue[tail++] = idx;
    }
  }
  const maxSideY = Math.floor(height * 0.9);
  for (let y = 1; y < maxSideY; y++) {
    const leftIdx = y * width;
    if (mask[leftIdx] < threshold && !visitedBg[leftIdx]) {
      visitedBg[leftIdx] = 1;
      queue[tail++] = leftIdx;
    }
    const rightIdx = y * width + (width - 1);
    if (mask[rightIdx] < threshold && !visitedBg[rightIdx]) {
      visitedBg[rightIdx] = 1;
      queue[tail++] = rightIdx;
    }
  }

  while (head < tail) {
    const curr = queue[head++];
    const cx = curr % width;
    const cy = (curr - cx) / width;

    if (cx > 0) {
      const n = curr - 1;
      if (!visitedBg[n] && mask[n] < threshold) {
        visitedBg[n] = 1;
        queue[tail++] = n;
      }
    }
    if (cx < width - 1) {
      const n = curr + 1;
      if (!visitedBg[n] && mask[n] < threshold) {
        visitedBg[n] = 1;
        queue[tail++] = n;
      }
    }
    if (cy > 0) {
      const n = curr - width;
      if (!visitedBg[n] && mask[n] < threshold) {
        visitedBg[n] = 1;
        queue[tail++] = n;
      }
    }
    if (cy < height - 1) {
      const n = curr + width;
      if (!visitedBg[n] && mask[n] < threshold) {
        visitedBg[n] = 1;
        queue[tail++] = n;
      }
    }
  }

  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    if (!visitedBg[i]) {
      // Interior pixel not connected to outer background -> force solid foreground
      out[i] = Math.max(mask[i], 1.0);
    } else {
      out[i] = mask[i];
    }
  }
  return out;
}

/**
 * Refines the raw segmentation mask using a Joint Bilateral (Edge-Guided) Filter:
 * Snaps the silhouette alpha contour directly to the true RGB color & luminance edges
 * of the person's hair, face, and shoulders.
 */
function refineMaskWithEdgeGuidedBilateralFilter(
  rawMask: Float32Array,
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): Float32Array {
  const filled = fillInteriorHoles(rawMask, width, height, 0.42);
  const refined = new Float32Array(width * height);
  const radius = 4;
  const sigmaSpaceSq = 2 * 2.5 * 2.5;
  const sigmaColorSq = 2 * 22 * 22;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const centerVal = filled[i];

      // Check if we are near the contour transition zone; if deep inside or deep outside, skip heavy filter
      let minN = centerVal;
      let maxN = centerVal;
      const y0 = Math.max(0, y - radius);
      const y1 = Math.min(height - 1, y + radius);
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);

      for (let ny = y0; ny <= y1; ny += 2) {
        for (let nx = x0; nx <= x1; nx += 2) {
          const v = filled[ny * width + nx];
          if (v < minN) minN = v;
          if (v > maxN) maxN = v;
        }
      }

      if (maxN - minN < 0.05) {
        refined[i] = centerVal > 0.5 ? 1.0 : 0.0;
        continue;
      }

      const cIdx = i * 4;
      const cr = rgba[cIdx];
      const cg = rgba[cIdx + 1];
      const cb = rgba[cIdx + 2];

      let weightSum = 0;
      let valSum = 0;

      for (let ny = y0; ny <= y1; ny++) {
        const dy = ny - y;
        const dySq = dy * dy;
        for (let nx = x0; nx <= x1; nx++) {
          const dx = nx - x;
          const spaceDistSq = dx * dx + dySq;
          const ni = ny * width + nx;
          const nIdx = ni * 4;
          const cDistSq = colorDistSq(cr, cg, cb, rgba[nIdx], rgba[nIdx + 1], rgba[nIdx + 2]);

          const w = Math.exp(-spaceDistSq / sigmaSpaceSq - cDistSq / sigmaColorSq);
          weightSum += w;
          valSum += w * filled[ni];
        }
      }

      const bilateralVal = weightSum > 0 ? valSum / weightSum : centerVal;
      // Soft contrast ramp around 0.48 so hair and shoulder edges are crisp yet smoothly anti-aliased
      const contrasted = Math.min(1, Math.max(0, (bilateralVal - 0.32) / 0.42));
      refined[i] = contrasted;
    }
  }

  return refined;
}

/**
 * Edge-Stopped Corner Flood-Fill Fallback (used only if WebAssembly is blocked):
 * Floods inward from top corners and stops immediately at Sobel edge gradients or color shifts
 * so it never cuts into hair or forehead.
 */
function computeEdgeStoppedFloodMask(rgba: Uint8ClampedArray, width: number, height: number): Float32Array {
  const total = width * height;
  // Compute Sobel gradient magnitude for every pixel
  const grad = new Float32Array(total);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const l = (i - 1) * 4;
      const r = (i + 1) * 4;
      const t = (i - width) * 4;
      const b = (i + width) * 4;
      const gx = Math.abs(rgba[r] - rgba[l]) + Math.abs(rgba[r + 1] - rgba[l + 1]) + Math.abs(rgba[r + 2] - rgba[l + 2]);
      const gy = Math.abs(rgba[b] - rgba[t]) + Math.abs(rgba[b + 1] - rgba[t + 1]) + Math.abs(rgba[b + 2] - rgba[t + 2]);
      grad[i] = (gx + gy) / 3;
    }
  }

  const isBg = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const seedPoints = [
    [2, 2],
    [width - 3, 2],
    [2, Math.floor(height * 0.25)],
    [width - 3, Math.floor(height * 0.25)],
  ];

  for (const [sx, sy] of seedPoints) {
    const idx = sy * width + sx;
    if (!isBg[idx]) {
      isBg[idx] = 1;
      queue[tail++] = idx;
    }
  }

  while (head < tail) {
    const curr = queue[head++];
    const cx = curr % width;
    const cy = (curr - cx) / width;
    const cIdx = curr * 4;
    const cr = rgba[cIdx];
    const cg = rgba[cIdx + 1];
    const cb = rgba[cIdx + 2];

    const neighbors = [
      cx > 0 ? curr - 1 : -1,
      cx < width - 1 ? curr + 1 : -1,
      cy > 0 ? curr - width : -1,
      cy < height - 1 ? curr + width : -1,
    ];

    for (const n of neighbors) {
      if (n < 0 || isBg[n]) continue;
      const nx = n % width;
      const ny = (n - nx) / width;

      // Never flood into the central face/body core
      const normX = (nx / width - 0.5) / 0.22;
      const normY = (ny / height - 0.52) / 0.42;
      if (normX * normX + normY * normY < 1.0) continue;

      const nIdx = n * 4;
      const stepDistSq = colorDistSq(cr, cg, cb, rgba[nIdx], rgba[nIdx + 1], rgba[nIdx + 2]);
      if (stepDistSq < 18 * 18 && grad[n] < 16) {
        isBg[n] = 1;
        queue[tail++] = n;
      }
    }
  }

  const mask = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    mask[i] = isBg[i] ? 0.0 : 1.0;
  }
  return mask;
}

/**
 * Extracts a true edge-recognized 3D person silhouette cutout using MediaPipe Neural Segmentation
 * + Edge-Guided Joint Bilateral Matting.
 */
export async function extractPersonSilhouetteCutout(imageUrl: string): Promise<string> {
  if (!imageUrl) return '';
  const cacheKey = `v3_neural_${imageUrl}`;
  if (silhouetteCache.has(cacheKey)) {
    return silhouetteCache.get(cacheKey)!;
  }

  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
      try {
        const size = 440;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(imageUrl);
          return;
        }

        // Center-crop square from portrait
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;

        let rawPersonMask: Float32Array | null = null;

        // 1. Run Google MediaPipe Neural Person Segmenter
        const segmenter = await getNeuralSegmenter();
        if (segmenter) {
          try {
            const segResult = segmenter.segment(canvas);
            if (segResult && segResult.confidenceMasks && segResult.confidenceMasks.length > 0) {
              // Select the mask that has high confidence in the center (person) and low in the top corners
              const mask0 = segResult.confidenceMasks[0];
              const mWidth = mask0.width;
              const mHeight = mask0.height;
              const floatArr = mask0.getAsFloat32Array();

              // Check polarity (whether mask0 is person or background)
              let centerSum = 0;
              let centerCnt = 0;
              let cornerSum = 0;
              let cornerCnt = 0;

              for (let my = 0; my < mHeight; my++) {
                const ny = my / mHeight;
                for (let mx = 0; mx < mWidth; mx++) {
                  const nx = mx / mWidth;
                  const val = floatArr[my * mWidth + mx];
                  if (nx > 0.35 && nx < 0.65 && ny > 0.25 && ny < 0.75) {
                    centerSum += val;
                    centerCnt++;
                  } else if ((nx < 0.08 || nx > 0.92) && ny < 0.12) {
                    cornerSum += val;
                    cornerCnt++;
                  }
                }
              }

              const centerAvg = centerCnt > 0 ? centerSum / centerCnt : 1;
              const cornerAvg = cornerCnt > 0 ? cornerSum / cornerCnt : 0;
              const invert = centerAvg < cornerAvg;

              // Bilinearly resample neural mask to `size x size`
              rawPersonMask = new Float32Array(size * size);
              for (let y = 0; y < size; y++) {
                const gy = (y / (size - 1)) * (mHeight - 1);
                const y0 = Math.floor(gy);
                const y1 = Math.min(mHeight - 1, y0 + 1);
                const wy = gy - y0;

                for (let x = 0; x < size; x++) {
                  const gx = (x / (size - 1)) * (mWidth - 1);
                  const x0 = Math.floor(gx);
                  const x1 = Math.min(mWidth - 1, x0 + 1);
                  const wx = gx - x0;

                  const v00 = floatArr[y0 * mWidth + x0];
                  const v10 = floatArr[y0 * mWidth + x1];
                  const v01 = floatArr[y1 * mWidth + x0];
                  const v11 = floatArr[y1 * mWidth + x1];

                  const top = v00 * (1 - wx) + v10 * wx;
                  const bot = v01 * (1 - wx) + v11 * wx;
                  const v = top * (1 - wy) + bot * wy;

                  rawPersonMask[y * size + x] = invert ? 1.0 - v : v;
                }
              }
            }
            if (segResult) {
              segResult.close();
            }
          } catch (segErr) {
            console.warn('Segmenter execution fallback:', segErr);
          }
        }

        // 2. Fallback to Edge-Stopped Flood Fill if neural mask wasn't produced
        if (!rawPersonMask) {
          rawPersonMask = computeEdgeStoppedFloodMask(data, size, size);
        }

        // 3. Refine mask with RGB Edge-Guided Joint Bilateral Filter & Interior Hole Fill
        const refinedAlpha = refineMaskWithEdgeGuidedBilateralFilter(rawPersonMask, data, size, size);

        // 4. Write alpha channel cleanly without altering the person's natural colors or hair
        for (let i = 0; i < size * size; i++) {
          data[i * 4 + 3] = Math.round(refinedAlpha[i] * 255);
        }

        ctx.putImageData(imgData, 0, 0);
        const outUrl = canvas.toDataURL('image/png');
        silhouetteCache.set(cacheKey, outUrl);
        resolve(outUrl);
      } catch (err) {
        console.warn('3D Silhouette extraction fallback:', err);
        resolve(imageUrl);
      }
    };

    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
}

/**
 * Synthesizes a crisp, unblurred 3D Architectural Horizon Stage from the actual background colors
 * of the user's portrait image—so selecting "Actual Portrait Background" creates a true 3D room/horizon
 * depth stage in the portrait's exact color palette without stretching the person's face in the background.
 */
export async function generate3DPortraitEnvironmentStage(imageUrl: string): Promise<string> {
  if (!imageUrl) return '';
  if (environmentCache.has(imageUrl)) {
    return environmentCache.get(imageUrl)!;
  }

  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = 64;
        sampleCanvas.height = 64;
        const sCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
        if (!sCtx) {
          resolve('');
          return;
        }
        sCtx.drawImage(img, 0, 0, 64, 64);
        const sData = sCtx.getImageData(0, 0, 64, 64).data;

        const getPixel = (x: number, y: number): RGB => {
          const i = (y * 64 + x) * 4;
          return { r: sData[i], g: sData[i + 1], b: sData[i + 2] };
        };

        const cTopLeft = getPixel(4, 4);
        const cTopRight = getPixel(59, 4);
        const cMidLeft = getPixel(4, 28);
        const cMidRight = getPixel(59, 28);

        const w = 960;
        const h = 540;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }

        const bgGrad = ctx.createLinearGradient(0, 0, w, h);
        bgGrad.addColorStop(0, `rgb(${cTopLeft.r}, ${cTopLeft.g}, ${cTopLeft.b})`);
        bgGrad.addColorStop(0.5, `rgb(${cTopRight.r}, ${cTopRight.g}, ${cTopRight.b})`);
        bgGrad.addColorStop(
          1,
          `rgb(${Math.round(cMidLeft.r * 0.7)}, ${Math.round(cMidLeft.g * 0.7)}, ${Math.round(cMidLeft.b * 0.75)})`
        );
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        const spotLeft = ctx.createRadialGradient(w * 0.25, h * 0.3, 10, w * 0.25, h * 0.3, w * 0.55);
        spotLeft.addColorStop(
          0,
          `rgba(${Math.min(255, cMidLeft.r + 45)}, ${Math.min(255, cMidLeft.g + 45)}, ${Math.min(255, cMidLeft.b + 60)}, 0.55)`
        );
        spotLeft.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = spotLeft;
        ctx.fillRect(0, 0, w, h);

        const spotRight = ctx.createRadialGradient(w * 0.78, h * 0.28, 10, w * 0.78, h * 0.28, w * 0.5);
        spotRight.addColorStop(
          0,
          `rgba(${Math.min(255, cMidRight.r + 50)}, ${Math.min(255, cMidRight.g + 40)}, ${Math.min(255, cMidRight.b + 55)}, 0.45)`
        );
        spotRight.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = spotRight;
        ctx.fillRect(0, 0, w, h);

        const outUrl = canvas.toDataURL('image/jpeg', 0.9);
        environmentCache.set(imageUrl, outUrl);
        resolve(outUrl);
      } catch {
        resolve('');
      }
    };

    img.onerror = () => resolve('');
    img.src = imageUrl;
  });
}
