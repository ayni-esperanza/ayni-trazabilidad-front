type RuntimeEnv = {
  API_URL?: string;
};

declare global {
  interface Window {
    __env?: RuntimeEnv;
  }
}

function readRuntimeEnv(): RuntimeEnv {
  if (typeof window === 'undefined' || !window.__env) {
    return {};
  }

  return window.__env;
}

export function resolveApiUrl(fallback: string): string {
  const runtimeApiUrl = readRuntimeEnv().API_URL?.trim();
  return runtimeApiUrl || fallback;
}
