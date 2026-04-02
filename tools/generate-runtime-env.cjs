const fs = require('node:fs');
const path = require('node:path');

function parseEnvFile(content) {
  const result = {};
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

function requireVar(key, envs) {
  const value = envs[key]?.trim();
  if (!value) {
    throw new Error(`[runtime-env] Missing required variable: ${key}`);
  }

  return value;
}

const root = process.cwd();
const envPath = path.resolve(root, '.env');
const outputPath = path.resolve(root, 'public', 'env.js');

if (!fs.existsSync(envPath)) {
  throw new Error(`[runtime-env] .env file not found at: ${envPath}`);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envs = parseEnvFile(envContent);

const apiUrl = requireVar('API_URL', envs);
const adminUsername = requireVar('ADMIN_USERNAME', envs).toLowerCase();

const generated = `window.__env = {\n  API_URL: ${JSON.stringify(apiUrl)},\n  ADMIN_USERNAME: ${JSON.stringify(adminUsername)},\n};\n`;

fs.writeFileSync(outputPath, generated, 'utf8');
console.log('[runtime-env] public/env.js generated from .env');
