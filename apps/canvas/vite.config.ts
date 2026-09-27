import react from '@vitejs/plugin-react';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

import { handleAnnotationsRequest } from './src/lib/server/annotations-api';
import { annotationPathsFor } from './src/lib/server/canvas-annotations-store';

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

export default defineConfig({
  plugins: [react(), annotationsApi()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // The canvas-data JSON is rewritten on every annotation autosave — never a reason to reload.
  server: { port: 8084, strictPort: true, watch: { ignored: ['**/canvas-data/**'] } },
});
