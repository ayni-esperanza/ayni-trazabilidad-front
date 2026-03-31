import { runtimeEnvironment } from './runtime-env';

export const environment = {
  production: true,
  ...runtimeEnvironment,
};
