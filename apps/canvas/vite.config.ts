import react from '@vitejs/plugin-react';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

import { handleAnnotationsRequest } from './src/lib/server/annotations-api';
import { annotationPathsFor } from './src/lib/server/canvas-annotations-store';
import { createScreenshotService, parseShotRequest } from './src/lib/server/screenshots';

const root = fileURLToPath(new URL('.', import.meta.url));

/** Mounts the annotations API (sticky notes + dropped images, saved into the repo) on the dev server. */
function annotationsApi(): Plugin {
  const paths = annotationPathsFor(root);
  return {
    name: 'canvas-annotations-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/canvas-annotations', (req, res, next) => {
        const url = new URL(req.originalUrl ?? req.url ?? '/', 'http://localhost');
        const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
        const request = new Request(url, {
          method: req.method,
          headers: req.headers as Record<string, string>,
          body: hasBody ? (Readable.toWeb(req) as ReadableStream) : undefined,
          // Node's fetch requires this for a streamed request body.
          ...(hasBody ? { duplex: 'half' } : {}),
        });
        handleAnnotationsRequest(request, paths)
          .then(async (response) => {
            res.statusCode = response.status;
            response.headers.forEach((value, key) => res.setHeader(key, value));
            res.end(Buffer.from(await response.arrayBuffer()));
          })
          .catch(next);
      });
    },
  };
}

/**
 * Serves frame screenshots (src/lib/server/screenshots.ts) and pushes new
 * frame versions to the canvas over Vite's HMR socket when a source change
 * makes some of them stale.
 */
function screenshotsApi(): Plugin {
  return {
    name: 'canvas-screenshots-api',
    // Vitest also runs configureServer; the file watchers would keep it from exiting.
    apply: (_config, env) => env.command === 'serve' && !process.env.VITEST,
    configureServer(server) {
      const service = createScreenshotService({
        cacheDir: path.join(root, '.shot-cache'),
        roots: {
          mobileDir: path.join(root, '../mobile'),
          sharedDir: path.join(root, '../../packages/shared'),
        },
        onStale: (versions, summary) => {
          server.config.logger.info(`canvas shots: ${summary}`, { timestamp: true });
          server.ws.send({ type: 'custom', event: 'canvas:shots', data: versions });
        },
      });
      server.httpServer?.on('close', () => void service.close());
      server.middlewares.use('/api/shots', (req, res) => {
        const url = new URL(req.originalUrl ?? req.url ?? '/', 'http://localhost');
        if (url.pathname.endsWith('/versions')) {
          void service.versions().then((versions) => {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            res.end(JSON.stringify(versions));
          });
          return;
        }
        const request = parseShotRequest(url.searchParams);
        if (!request) {
          res.statusCode = 400;
          res.end('Bad screenshot request');
          return;
        }
        service
          .get(request, url.searchParams.get('p') === 'background' ? 'background' : 'visible')
          .then((image) => {
            res.setHeader('Content-Type', 'image/webp');
            // The URL carries the frame's source version, so a given URL never changes.
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.end(image);
          })
          .catch((error: unknown) => {
            server.config.logger.warn(
              `canvas screenshot failed (${request.query}): ${String(error)}`,
            );
            res.statusCode = 503;
            res.setHeader('Cache-Control', 'no-store');
            res.end('Screenshot failed');
          });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), annotationsApi(), screenshotsApi()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // The canvas-data JSON is rewritten on every annotation autosave — never a reason to reload.
  server: {
    port: 8084,
    strictPort: true,
    watch: { ignored: ['**/canvas-data/**', '**/.shot-cache/**'] },
  },
});
