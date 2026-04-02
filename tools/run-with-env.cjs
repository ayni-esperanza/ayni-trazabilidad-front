const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

function parseEnvFile(content) {
  const result = {};

  for (const line of content.split(/\r?\n/)) {
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

const envPath = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  throw new Error(`[runtime-env] .env file not found at: ${envPath}`);
}

const envValues = parseEnvFile(fs.readFileSync(envPath, 'utf8'));
const [, , command, ...args] = process.argv;

if (!command) {
  throw new Error('[runtime-env] Missing command to execute.');
}

const child = spawn(command, args, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    ...envValues,
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
