/**
 * AI Photo Enhancer & Headshot Studio Synthesizer
 * Provides studio lighting, color grading, tone curves, and styled vignettes.
 * Ensures photo modification always produces visible, professional headshot results.
 */

export type AvatarStyle = 'executive' | 'casual' | 'country_club' | 'athletic' | 'cyber' | 'editorial' | 'custom' | 'golf' | 'soccer';

export interface EnhanceOptions {
  imageUrl: string;
  style?: AvatarStyle | null;
  prompt?: string;
  intensity?: number; // 0 to 1
}

/**
 * Loads an image from URL or dataURL into an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for AI enhancement'));
    img.src = src;
  });
}

/**
 * Applies photographic studio enhancements according to the selected style or custom instructions
 */
export async function enhancePhotoWithAI(options: EnhanceOptions): Promise<string> {
  const { imageUrl, style, prompt = '' } = options;
  const effectiveStyle = style || 'custom';
  const promptLower = prompt.toLowerCase();
  const img = await loadImage(imageUrl);

  const canvas = document.createElement('canvas');
  const size = 720; // High resolution square
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // 1. Center crop and draw base photo
  const minDim = Math.min(img.width, img.height);
  const sx = (img.width - minDim) / 2;
  const sy = (img.height - minDim) / 2;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Apply base CSS filter adjustments on canvas depending on style or custom prompt
  switch (effectiveStyle) {
    case 'editorial':
      ctx.filter = 'grayscale(100%) contrast(135%) brightness(95%)';
      break;
    case 'cyber':
      ctx.filter = 'contrast(125%) saturate(140%) brightness(98%) hue-rotate(10deg)';
      break;
    case 'casual':
      ctx.filter = 'contrast(105%) saturate(115%) brightness(104%) sepia(12%)';
      break;
    case 'country_club':
    case 'golf':
      ctx.filter = 'contrast(115%) saturate(122%) brightness(102%)';
      break;
    case 'athletic':
    case 'soccer':
      ctx.filter = 'contrast(120%) saturate(128%) brightness(100%)';
      break;
    case 'custom':
      if (promptLower.includes('black and white') || promptLower.includes('monochrome') || promptLower.includes('b&w')) {
        ctx.filter = 'grayscale(100%) contrast(130%) brightness(98%)';
      } else if (promptLower.includes('warm') || promptLower.includes('golden') || promptLower.includes('sunset')) {
        ctx.filter = 'contrast(110%) saturate(118%) brightness(103%) sepia(10%)';
      } else {
        ctx.filter = 'contrast(114%) saturate(112%) brightness(101%)';
      }
      break;
    case 'executive':
    default:
      ctx.filter = 'contrast(118%) saturate(110%) brightness(101%)';
      break;
  }

  // Draw source image
  ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

  // Reset filter for lighting and gradient overlays
  ctx.filter = 'none';

  // 2. Add Studio Key Lighting (Soft highlight in center of portrait)
  const keyLight = ctx.createRadialGradient(size * 0.45, size * 0.4, 40, size * 0.5, size * 0.5, size * 0.6);
  keyLight.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
  keyLight.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
  keyLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = keyLight;
  ctx.fillRect(0, 0, size, size);

  // 3. Style-specific Studio Vignette & Rim Lighting Overlays
  switch (effectiveStyle) {
    case 'executive': {
      // Boardroom Navy & Obsidian Studio Vignette
      const execVignette = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.35, size * 0.5, size * 0.5, size * 0.72);
      execVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      execVignette.addColorStop(0.65, 'rgba(15, 23, 42, 0.25)');
      execVignette.addColorStop(1, 'rgba(10, 15, 30, 0.7)');
      ctx.fillStyle = execVignette;
      ctx.fillRect(0, 0, size, size);

      // Subtle cool blue rim light on top-right
      const execRim = ctx.createLinearGradient(size * 0.7, 0, size, size * 0.4);
      execRim.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
      execRim.addColorStop(1, 'rgba(99, 102, 241, 0)');
      ctx.fillStyle = execRim;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'casual': {
      // Warm Golden Hour Peach / Amber Sunlight Overlay
      const sunGlow = ctx.createRadialGradient(size * 0.15, size * 0.15, 10, size * 0.3, size * 0.3, size * 0.85);
      sunGlow.addColorStop(0, 'rgba(255, 220, 150, 0.28)');
      sunGlow.addColorStop(0.5, 'rgba(251, 146, 60, 0.1)');
      sunGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = sunGlow;
      ctx.fillRect(0, 0, size, size);

      // Soft natural vignette
      const warmVignette = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.4, size * 0.5, size * 0.5, size * 0.72);
      warmVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      warmVignette.addColorStop(1, 'rgba(50, 20, 10, 0.4)');
      ctx.fillStyle = warmVignette;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'country_club':
    case 'golf': {
      // Country Club Sunlit Terrace & Emerald Toning
      const clubRim = ctx.createLinearGradient(0, 0, size * 0.5, size * 0.5);
      clubRim.addColorStop(0, 'rgba(255, 255, 230, 0.22)');
      clubRim.addColorStop(0.5, 'rgba(16, 185, 129, 0.08)');
      clubRim.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = clubRim;
      ctx.fillRect(0, 0, size, size);

      // Subtle rich green/slate corner gradient
      const clubVignette = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.4, size * 0.5, size * 0.5, size * 0.72);
      clubVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      clubVignette.addColorStop(1, 'rgba(6, 40, 25, 0.5)');
      ctx.fillStyle = clubVignette;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'athletic':
    case 'soccer': {
      // Dynamic Arena / Athletic Studio Accent & Crisp Contrast
      const arenaLight = ctx.createLinearGradient(0, 0, size * 0.4, size * 0.4);
      arenaLight.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      arenaLight.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = arenaLight;
      ctx.fillRect(0, 0, size, size);

      // Athletic cyan rim
      const cyanRim = ctx.createLinearGradient(size, size, size * 0.6, size * 0.6);
      cyanRim.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
      cyanRim.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = cyanRim;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'cyber': {
      // Neon Cyan & Purple Dual-Tone Edge Glows
      const cyanEdge = ctx.createLinearGradient(0, 0, size * 0.35, size);
      cyanEdge.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
      cyanEdge.addColorStop(0.5, 'rgba(6, 182, 212, 0)');
      cyanEdge.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = cyanEdge;
      ctx.fillRect(0, 0, size, size);

      const purpleEdge = ctx.createLinearGradient(size, size, size * 0.65, 0);
      purpleEdge.addColorStop(0, 'rgba(168, 85, 247, 0.35)');
      purpleEdge.addColorStop(0.5, 'rgba(168, 85, 247, 0)');
      purpleEdge.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = purpleEdge;
      ctx.fillRect(0, 0, size, size);

      // Midnight vignette
      const darkVignette = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.3, size * 0.5, size * 0.5, size * 0.72);
      darkVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      darkVignette.addColorStop(1, 'rgba(2, 6, 23, 0.75)');
      ctx.fillStyle = darkVignette;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'editorial': {
      // Classic Velvety Black & White Dramatic Studio Lighting
      const bwShadows = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.28, size * 0.5, size * 0.5, size * 0.72);
      bwShadows.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      bwShadows.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
      bwShadows.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
      ctx.fillStyle = bwShadows;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'custom':
    default: {
      // Clean Studio Portrait Vignette for Custom Prompt
      const customVignette = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.38, size * 0.5, size * 0.5, size * 0.74);
      customVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      customVignette.addColorStop(1, 'rgba(15, 23, 42, 0.55)');
      ctx.fillStyle = customVignette;
      ctx.fillRect(0, 0, size, size);
      break;
    }
  }

  // 4. Subtle AI Studio Stamp at bottom right corner
  const stampLabelMap: Record<string, string> = {
    executive: 'EXECUTIVE',
    casual: 'CASUAL',
    country_club: 'COUNTRY CLUB',
    golf: 'COUNTRY CLUB',
    athletic: 'ATHLETIC',
    soccer: 'ATHLETIC',
    cyber: 'TECH & CYBER',
    editorial: 'EDITORIAL',
    custom: 'CUSTOM',
  };
  const stampLabel = stampLabelMap[effectiveStyle] || effectiveStyle.replace('_', ' ').toUpperCase();

  ctx.font = '600 13px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.textAlign = 'right';
  ctx.fillText(`AI STUDIO · ${stampLabel}`, size - 18, size - 18);

  return canvas.toDataURL('image/jpeg', 0.94);
}
