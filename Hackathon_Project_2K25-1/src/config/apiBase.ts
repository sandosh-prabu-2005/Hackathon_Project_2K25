const FALLBACK_API_BASE = '/backend';

const trimTrailingSlash = (value: string): string => {
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

export const getApiBase = (): string => {
  const envBase = (import.meta.env.VITE_API_BASE || import.meta.env.VITE_BACKEND_URL || '').trim();
  const candidate = envBase || FALLBACK_API_BASE;

  // Prevent mixed-content errors when app is served via HTTPS.
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    candidate.startsWith('http://')
  ) {
    return FALLBACK_API_BASE;
  }

  return trimTrailingSlash(candidate);
};

export const API_BASE = getApiBase();
