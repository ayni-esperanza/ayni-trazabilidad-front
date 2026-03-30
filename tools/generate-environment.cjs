const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

const projectRoot = process.cwd();
const envFile = process.env.ENV_FILE || '.env';
const envPath = path.resolve(projectRoot, envFile);

if (!fs.existsSync(envPath)) {
  console.error(`[env] Archivo no encontrado: ${envPath}`);
  process.exit(1);
}

dotenv.config({ path: envPath });

const requiredKeys = ['API_URL', 'ADMIN_USERNAME'];
const missingKeys = requiredKeys.filter((key) => {
  const value = process.env[key];
  return !value || !value.trim();
});

if (missingKeys.length > 0) {
  console.error(`[env] Faltan variables requeridas en ${envFile}: ${missingKeys.join(', ')}`);
  process.exit(1);
}

const generated = `export const generatedEnvironment = {
  apiUrl: '${process.env.API_URL.trim()}',
  adminUsername: '${process.env.ADMIN_USERNAME.trim().toLowerCase()}',
};
`;

const environmentTs = `import { generatedEnvironment } from './environment.generated';

export const environment = {
  production: false,
  ...generatedEnvironment,
};
`;

const environmentProdTs = `import { generatedEnvironment } from './environment.generated';

export const environment = {
  production: true,
  ...generatedEnvironment,
};
`;

const environmentsDir = path.resolve(projectRoot, 'src', 'environments');
fs.mkdirSync(environmentsDir, { recursive: true });
fs.writeFileSync(path.join(environmentsDir, 'environment.generated.ts'), generated, 'utf8');
fs.writeFileSync(path.join(environmentsDir, 'environment.ts'), environmentTs, 'utf8');
fs.writeFileSync(path.join(environmentsDir, 'environment.prod.ts'), environmentProdTs, 'utf8');

console.log(`[env] Entornos generados desde ${envFile}`);
