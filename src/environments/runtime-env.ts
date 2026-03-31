type RuntimeWindowEnv = {
  API_URL?: string;
  ADMIN_USERNAME?: string;
};

declare global {
  interface Window {
    __env?: RuntimeWindowEnv;
  }
}

function normalize(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized || /^__.+__$/.test(normalized)) {
    return undefined;
  }

  return normalized;
}

const isBrowser = typeof window !== 'undefined';
const serverEnv =
  typeof globalThis !== 'undefined'
    ? (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    : undefined;

function requireValue(key: keyof RuntimeWindowEnv, value: string | undefined): string {
  if (!value) {
    if (!isBrowser) {
      return `__${key}_UNSET__`;
    }

    throw new Error(`[runtime-env] Missing required variable: ${key}. Define it in env.js during deploy.`);
  }

  return value;
}

const runtimeSource: RuntimeWindowEnv = isBrowser
  ? (window.__env ?? {})
  : {
      API_URL: serverEnv?.['API_URL'],
      ADMIN_USERNAME: serverEnv?.['ADMIN_USERNAME'],
    };

export const runtimeEnvironment = {
  apiUrl: requireValue('API_URL', normalize(runtimeSource.API_URL)),
  adminUsername: requireValue('ADMIN_USERNAME', normalize(runtimeSource.ADMIN_USERNAME)).toLowerCase(),
};
