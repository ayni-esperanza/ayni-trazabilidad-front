import { resolveApiUrl } from './runtime-env';

export const environment = {
  production: true,
  apiUrl: resolveApiUrl('https://api.tu-dominio.com/api/v1'),
};
