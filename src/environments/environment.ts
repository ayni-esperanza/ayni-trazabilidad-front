import { resolveApiUrl } from './runtime-env';

export const environment = {
  production: false,
  apiUrl: resolveApiUrl('http://localhost:8080/api/v1'),
};
