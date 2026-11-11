/**
 * AI Photo Enhancer & Headshot Studio Synthesizer
 * Provides professional studio lighting, tone curves, artistic styling, and cinematic color grading.
 * Ensures photo modification always produces visible, striking, and high-fidelity results.
 */

export type AvatarStyle =
  | 'executive'
  | 'casual'
  | 'country_club'
  | 'athletic'
  | 'cyber'
  | 'editorial'
  | 'custom'
  | 'golf'
  | 'soccer'
  | '3d_pixar'
  | 'comic_book'
  | 'cartoon'
  | 'manga'
  | '3d_photoreal'
  | 'cyberpunk'
  | 'pop_art'
  | 'oil_painting';

export interface EnhanceOptions {
  imageUrl: string;
  style?: AvatarStyle | null;
  prompt?: string;
  intensity?: number;
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
  const effectiveStyle: AvatarStyle = style || 'custom';
  const promptLower = prompt.toLowerCase().trim();
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
      ctx.filter = 'grayscale(100%) contrast(165%) brightness(96%)';
      break;
    case 'cyber':
    case 'cyberpunk':
      ctx.filter = 'contrast(140%) saturate(160%) hue-rotate(15deg) brightness(98%)';
      break;
    case 'casual':
      ctx.filter = 'contrast(115%) saturate(135%) brightness(108%) sepia(20%)';
      break;
    case 'country_club':
    case 'golf':
      ctx.filter = 'contrast(125%) saturate(135%) brightness(104%)';
      break;
    case 'athletic':
    case 'soccer':
      ctx.filter = 'contrast(140%) saturate(145%) brightness(102%)';
      break;
    case '3d_pixar':
    case '3d_photoreal':
      ctx.filter = 'saturate(165%) contrast(130%) brightness(108%)';
      break;
    case 'comic_book':
      ctx.filter = 'contrast(170%) saturate(160%) brightness(105%)';
      break;
    case 'cartoon':
      ctx.filter = 'saturate(180%) contrast(140%) brightness(110%)';
      break;
    case 'manga':
      ctx.filter = 'contrast(155%) saturate(85%) brightness(112%)';
      break;
    case 'pop_art':
      ctx.filter = 'contrast(190%) saturate(210%) brightness(105%)';
      break;
    case 'oil_painting':
      ctx.filter = 'contrast(135%) saturate(140%) sepia(45%) brightness(98%)';
      break;
    case 'custom':
      if (promptLower.includes('black and white') || promptLower.includes('monochrome') || promptLower.includes('b&w') || promptLower.includes('noir')) {
        ctx.filter = 'grayscale(100%) contrast(165%) brightness(96%)';
      } else if (promptLower.includes('warm') || promptLower.includes('golden') || promptLower.includes('sunset') || promptLower.includes('summer')) {
        ctx.filter = 'contrast(120%) saturate(145%) brightness(108%) sepia(25%)';
      } else if (promptLower.includes('cyber') || promptLower.includes('neon') || promptLower.includes('futuristic')) {
        ctx.filter = 'contrast(145%) saturate(165%) hue-rotate(20deg) brightness(100%)';
      } else if (promptLower.includes('comic') || promptLower.includes('anime') || promptLower.includes('cartoon')) {
        ctx.filter = 'contrast(170%) saturate(165%) brightness(108%)';
      } else if (promptLower.includes('oil') || promptLower.includes('painting') || promptLower.includes('canvas')) {
        ctx.filter = 'contrast(135%) saturate(140%) sepia(45%) brightness(98%)';
      } else if (promptLower.includes('cool') || promptLower.includes('blue') || promptLower.includes('winter')) {
        ctx.filter = 'contrast(130%) saturate(125%) hue-rotate(-20deg) brightness(102%)';
      } else {
        ctx.filter = 'contrast(135%) saturate(130%) brightness(104%)';
      }
      break;
    case 'executive':
    default:
      ctx.filter = 'contrast(130%) saturate(120%) brightness(102%)';
      break;
  }

  // Draw source image with filter applied
  ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

  // Reset filter for subsequent lighting and gradient passes
  ctx.filter = 'none';

  // 2. Add Key Studio Lighting (Soft face highlight)
  const keyLight = ctx.createRadialGradient(size * 0.48, size * 0.38, 40, size * 0.5, size * 0.5, size * 0.6);
  keyLight.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
  keyLight.addColorStop(0.55, 'rgba(255, 255, 255, 0.06)');
  keyLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = keyLight;
  ctx.fillRect(0, 0, size, size);

  // 3. Style-specific Artistic Overlays, Vignettes & Rim Highlights
  switch (effectiveStyle) {
    case 'executive': {
      // Boardroom Navy & Obsidian Studio Vignette
      const execVignette = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.32, size * 0.5, size * 0.5, size * 0.72);
      execVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      execVignette.addColorStop(0.65, 'rgba(15, 23, 42, 0.35)');
      execVignette.addColorStop(1, 'rgba(10, 15, 30, 0.8)');
      ctx.fillStyle = execVignette;
      ctx.fillRect(0, 0, size, size);

      // Cool sapphire rim light on top-right
      const execRim = ctx.createLinearGradient(size * 0.65, 0, size, size * 0.45);
      execRim.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
      execRim.addColorStop(1, 'rgba(99, 102, 241, 0)');
      ctx.fillStyle = execRim;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'casual': {
      // Warm Golden Hour Peach / Amber Sunlight Overlay
      const sunGlow = ctx.createRadialGradient(size * 0.15, size * 0.15, 20, size * 0.35, size * 0.35, size * 0.9);
      sunGlow.addColorStop(0, 'rgba(255, 220, 140, 0.35)');
      sunGlow.addColorStop(0.45, 'rgba(251, 146, 60, 0.15)');
      sunGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = sunGlow;
      ctx.fillRect(0, 0, size, size);

      const warmVignette = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.35, size * 0.5, size * 0.5, size * 0.72);
      warmVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      warmVignette.addColorStop(1, 'rgba(60, 25, 10, 0.45)');
      ctx.fillStyle = warmVignette;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'country_club':
    case 'golf': {
      // Country Club Sunlit Terrace & Emerald Toning
      const clubRim = ctx.createLinearGradient(0, 0, size * 0.5, size * 0.5);
      clubRim.addColorStop(0, 'rgba(255, 255, 220, 0.3)');
      clubRim.addColorStop(0.5, 'rgba(16, 185, 129, 0.12)');
      clubRim.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = clubRim;
      ctx.fillRect(0, 0, size, size);

      const clubVignette = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.35, size * 0.5, size * 0.5, size * 0.72);
      clubVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      clubVignette.addColorStop(1, 'rgba(6, 40, 25, 0.55)');
      ctx.fillStyle = clubVignette;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'athletic':
    case 'soccer': {
      // Dynamic Arena Athletic Lighting
      const arenaLight = ctx.createLinearGradient(0, 0, size * 0.4, size * 0.4);
      arenaLight.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
      arenaLight.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = arenaLight;
      ctx.fillRect(0, 0, size, size);

      const cyanRim = ctx.createLinearGradient(size, size, size * 0.55, size * 0.55);
      cyanRim.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
      cyanRim.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = cyanRim;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'cyber':
    case 'cyberpunk': {
      // Neon Cyan & Magenta Cyberpunk Edge Glows
      const cyanEdge = ctx.createLinearGradient(0, 0, size * 0.4, size);
      cyanEdge.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
      cyanEdge.addColorStop(0.5, 'rgba(6, 182, 212, 0.08)');
      cyanEdge.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = cyanEdge;
      ctx.fillRect(0, 0, size, size);

      const purpleEdge = ctx.createLinearGradient(size, size, size * 0.6, 0);
      purpleEdge.addColorStop(0, 'rgba(217, 70, 239, 0.45)');
      purpleEdge.addColorStop(0.5, 'rgba(168, 85, 247, 0.08)');
      purpleEdge.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = purpleEdge;
      ctx.fillRect(0, 0, size, size);

      const darkVignette = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.28, size * 0.5, size * 0.5, size * 0.74);
      darkVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      darkVignette.addColorStop(1, 'rgba(2, 6, 23, 0.82)');
      ctx.fillStyle = darkVignette;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'editorial': {
      // Classic Velvety Black & White Dramatic Studio Lighting
      const bwShadows = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.25, size * 0.5, size * 0.5, size * 0.72);
      bwShadows.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
      bwShadows.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
      bwShadows.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
      ctx.fillStyle = bwShadows;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case '3d_pixar':
    case '3d_photoreal': {
      // 3D Animated Film Subsurface Glow & Rim
      const ambientGlow = ctx.createRadialGradient(size * 0.5, size * 0.45, 30, size * 0.5, size * 0.5, size * 0.65);
      ambientGlow.addColorStop(0, 'rgba(255, 240, 220, 0.25)');
      ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = ambientGlow;
      ctx.fillRect(0, 0, size, size);

      const rim3D = ctx.createLinearGradient(0, 0, size, size);
      rim3D.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
      rim3D.addColorStop(1, 'rgba(245, 158, 11, 0.22)');
      ctx.fillStyle = rim3D;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'comic_book': {
      // Dynamic Graphic Halftone & Action Vignette
      const comicVignette = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.35, size * 0.5, size * 0.5, size * 0.74);
      comicVignette.addColorStop(0, 'rgba(250, 204, 21, 0)');
      comicVignette.addColorStop(0.7, 'rgba(220, 38, 38, 0.2)');
      comicVignette.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
      ctx.fillStyle = comicVignette;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'cartoon': {
      // Playful Bright Studio Vignette
      const cartoonGlow = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.3, size * 0.5, size * 0.5, size * 0.72);
      cartoonGlow.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
      cartoonGlow.addColorStop(1, 'rgba(15, 23, 42, 0.5)');
      ctx.fillStyle = cartoonGlow;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'manga': {
      // Anime Cel-Shaded Purple/Cyan Lighting
      const animeRim = ctx.createLinearGradient(0, 0, size, size);
      animeRim.addColorStop(0, 'rgba(168, 85, 247, 0.28)');
      animeRim.addColorStop(1, 'rgba(59, 130, 246, 0.22)');
      ctx.fillStyle = animeRim;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'oil_painting': {
      // Classical Rembrandt Chiaroscuro & Canvas Warmth
      const oilGlow = ctx.createRadialGradient(size * 0.45, size * 0.35, 40, size * 0.5, size * 0.5, size * 0.75);
      oilGlow.addColorStop(0, 'rgba(255, 215, 120, 0.32)');
      oilGlow.addColorStop(0.5, 'rgba(180, 100, 30, 0.2)');
      oilGlow.addColorStop(1, 'rgba(20, 10, 5, 0.85)');
      ctx.fillStyle = oilGlow;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'pop_art': {
      // Bold Pop Art Dual-Tone Saturation Overlay
      const popGrad = ctx.createLinearGradient(0, 0, size, size);
      popGrad.addColorStop(0, 'rgba(236, 72, 153, 0.25)');
      popGrad.addColorStop(1, 'rgba(234, 179, 8, 0.25)');
      ctx.fillStyle = popGrad;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'custom':
    default: {
      const customVignette = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.32, size * 0.5, size * 0.5, size * 0.74);
      customVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      customVignette.addColorStop(1, 'rgba(15, 23, 42, 0.65)');
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
    cyberpunk: 'CYBERPUNK',
    editorial: 'EDITORIAL',
    '3d_pixar': '3D ANIMATION',
    '3d_photoreal': '3D PHOTOREAL',
    comic_book: 'COMIC BOOK',
    cartoon: 'CARTOON',
    manga: 'MANGA & ANIME',
    oil_painting: 'OIL PORTRAIT',
    pop_art: 'POP ART',
    custom: promptLower ? promptLower.slice(0, 16).toUpperCase() : 'CUSTOM AI',
  };
  const stampLabel = stampLabelMap[effectiveStyle] || effectiveStyle.replace('_', ' ').toUpperCase();

  ctx.font = '700 12px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.textAlign = 'right';
  ctx.fillText(`AI STUDIO · ${stampLabel}`, size - 16, size - 16);

  return canvas.toDataURL('image/jpeg', 0.94);
}
