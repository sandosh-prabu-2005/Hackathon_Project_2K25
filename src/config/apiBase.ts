const FALLBACK_API_BASE = 'https://w62srqa987.execute-api.us-east-1.amazonaws.com/prod-deploy-backend';

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

export const getCrowdApiBase = (): string => {
  const crowdEnvBase = (import.meta.env.VITE_CROWD_API_BASE || import.meta.env.VITE_CROWD_BACKEND_URL || '').trim();
  if (!crowdEnvBase) return API_BASE;

  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    crowdEnvBase.startsWith('http://')
  ) {
    return API_BASE;
  }

  return trimTrailingSlash(crowdEnvBase);
};

export const CROWD_API_BASE = getCrowdApiBase();

export const CROWD_API_KEY = (import.meta.env.VITE_CROWD_API_KEY || '').trim();

export const getCrowdAuthHeaders = (): Record<string, string> => {
  if (!CROWD_API_KEY) return {};
  return { "x-api-key": CROWD_API_KEY };
};
