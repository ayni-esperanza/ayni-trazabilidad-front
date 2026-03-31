import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine, isMainModule } from '@angular/ssr/node';
import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bootstrap from './main.server';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.server.html');

const app = express();
const commonEngine = new CommonEngine();

function normalizeBasePath(value: string | undefined): string {
  const raw = value?.trim();
  if (!raw || raw === '/') {
    return '/';
  }

  const withoutTrailing = raw.endsWith('/') ? raw.slice(0, -1) : raw;
  return withoutTrailing.startsWith('/') ? `${withoutTrailing}/` : `/${withoutTrailing}/`;
}

const appBasePath = normalizeBasePath(process.env['APP_BASE_PATH']);

function readRequiredEnv(key: 'API_URL' | 'ADMIN_USERNAME'): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`[runtime-env] Missing required variable: ${key}`);
  }

  return value;
}

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/**', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve runtime env for browser hydration
 */
app.get(`${appBasePath}env.js`, (_req, res) => {
  const apiUrl = readRequiredEnv('API_URL');
  const adminUsername = readRequiredEnv('ADMIN_USERNAME').toLowerCase();

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.send(`window.__env = { API_URL: "${apiUrl}", ADMIN_USERNAME: "${adminUsername}" };`);
});

/**
 * Serve static files from /browser
 */
app.use(
  appBasePath,
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html'
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.get(appBasePath === '/' ? '**' : `${appBasePath}**`, (req, res, next) => {
  const { protocol, originalUrl, headers } = req;

  commonEngine
    .render({
      bootstrap,
      documentFilePath: indexHtml,
      url: `${protocol}://${headers.host}${originalUrl}`,
      publicPath: browserDistFolder,
      providers: [{ provide: APP_BASE_HREF, useValue: appBasePath }],
    })
    .then((html) => {
      const htmlWithBase = html.replace('<base href="/">', `<base href="${appBasePath}">`);
      res.send(htmlWithBase);
    })
    .catch((err) => next(err));
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export default app;
