import { runtimeEnvironment } from './runtime-env';

export const environment = {
  production: false,
  ...runtimeEnvironment,
};
