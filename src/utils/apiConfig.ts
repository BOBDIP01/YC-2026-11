/**
 * Mobile & Web API Routing Configuration for Capacitor (iOS / Android) and Web
 * Ensures API calls, WebSockets, and public QR/NFC URLs never point to
 * `capacitor://localhost` or `https://localhost` inside native mobile builds.
 */

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => 'ios' | 'android' | 'web';
      Plugins?: Record<string, any>;
    };
  }
}

const env = (import.meta as any).env || {};

/**
 * Detects if the app is running inside a native iOS or Android Capacitor WebView shell.
 */
export function isNativeMobilePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.Capacitor?.isNativePlatform === 'function') {
    return Boolean(window.Capacitor.isNativePlatform());
  }
  const proto = window.location.protocol;
  const host = window.location.hostname;
  return (
    proto === 'capacitor:' ||
    proto === 'ionic:' ||
    (host === 'localhost' && Boolean(window.Capacitor))
  );
}

/**
 * Returns the current runtime platform ('ios' | 'android' | 'web').
 */
export function getRuntimePlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web';
  if (typeof window.Capacitor?.getPlatform === 'function') {
    const p = window.Capacitor.getPlatform();
    if (p === 'ios' || p === 'android') return p;
  }
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  if (isNativeMobilePlatform()) {
    if (/iPad|iPhone|iPod/i.test(ua)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
  }
  return 'web';
}

/**
 * Returns the base URL for backend HTTP API calls (`/api/...`).
 * - In native iOS/Android builds, uses `VITE_API_BASE_URL` (e.g. `https://api.youconnect.app`).
 * - In web browsers, uses `VITE_API_BASE_URL` if set, otherwise relative `''`.
 */
export function getApiBaseUrl(): string {
  const configured = String(env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
  if (configured) return configured;

  if (isNativeMobilePlatform()) {
    const publicWeb = String(env.VITE_PUBLIC_WEB_ORIGIN || 'https://youconnect.app')
      .trim()
      .replace(/\/+$/, '');
    return publicWeb;
  }
  return '';
}

/**
 * Resolves an API path (e.g. `/api/ai/bio`) to a full URL for `fetch()`.
 */
export function apiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${cleanPath}` : cleanPath;
}

/**
 * Returns the canonical public HTTPS origin used for QR codes, NFC NDEF URL records,
 * and Universal Links (`https://youconnect.app`), ensuring mobile WebViews never encode
 * `capacitor://localhost` or `https://localhost` into shared links.
 */
export function getPublicWebOrigin(): string {
  const configuredOrigin = String(env.VITE_PUBLIC_WEB_ORIGIN || env.VITE_APP_URL || '')
    .trim()
    .replace(/\/+$/, '');
  if (configuredOrigin) return configuredOrigin;

  if (typeof window === 'undefined' || isNativeMobilePlatform()) {
    return 'https://youconnect.app';
  }
  return window.location.origin;
}

/**
 * Resolves the WebSocket endpoint for P2P Radar signaling (`/api/p2p-radar`).
 */
export function getWebSocketUrl(path = '/api/p2p-radar'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const configuredWs = String(env.VITE_WS_BASE_URL || '').trim().replace(/\/+$/, '');
  if (configuredWs) {
    return `${configuredWs}${cleanPath}`;
  }

  const apiBase = getApiBaseUrl();
  if (apiBase && /^https?:\/\//i.test(apiBase)) {
    const wsBase = apiBase.replace(/^http/i, 'ws');
    return `${wsBase}${cleanPath}`;
  }

  if (typeof window !== 'undefined' && !isNativeMobilePlatform()) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${cleanPath}`;
  }

  return `wss://youconnect.app${cleanPath}`;
}

let cachedAuthTokenGetter: (() => Promise<string | null>) | null = null;

/**
 * Registers the Firebase ID token provider so `apiFetch` automatically attaches
 * `Authorization: Bearer <idToken>` to backend API calls.
 */
export function registerAuthTokenGetter(getter: () => Promise<string | null>) {
  cachedAuthTokenGetter = getter;
}

/**
 * Wrapper around `fetch()` that resolves mobile API base URLs and attaches
 * the user's Firebase Auth Bearer token if available.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const resolved = path.startsWith('http://') || path.startsWith('https://') ? path : apiUrl(path);
  const headers = new Headers(init.headers || {});

  if (cachedAuthTokenGetter) {
    try {
      const token = await cachedAuthTokenGetter();
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    } catch {
      // Proceed without token if offline or unauthenticated
    }
  }

  return fetch(resolved, {
    ...init,
    headers,
  });
}

