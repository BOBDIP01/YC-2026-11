/**
 * Safely parses and normalizes video URLs (YouTube, Vimeo, direct MP4) into responsive iframe or video sources
 */
export function getVideoEmbedUrl(url?: string): { type: 'youtube' | 'vimeo' | 'video' | 'link'; embedUrl: string } | null {
  if (!url) return null;
  const trimmed = url.trim();

  // YouTube match
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0`,
    };
  }

  // Vimeo match
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  // Direct MP4 / WebM
  if (trimmed.match(/\.(mp4|webm|mov)(\?.*)?$/i)) {
    return {
      type: 'video',
      embedUrl: trimmed,
    };
  }

  return {
    type: 'link',
    embedUrl: trimmed,
  };
}
