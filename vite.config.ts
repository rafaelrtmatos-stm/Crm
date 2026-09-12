import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv, Plugin} from 'vite';

function apiDevMiddleware(): Plugin {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        try {
          const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
          const routeName = parsedUrl.pathname.replace(/^\/api\//, '').replace(/\/$/, '');
          let filePath = path.resolve(__dirname, 'api', `${routeName}.js`);

          if (!fs.existsSync(filePath)) {
            // Check dynamic route like assinar/[id].js
            const parts = routeName.split('/');
            if (parts.length === 2) {
              const dynPath = path.resolve(__dirname, 'api', parts[0], '[id].js');
              if (fs.existsSync(dynPath)) {
                filePath = dynPath;
                (req as any).query = { ...(req as any).query, id: parts[1] };
              } else {
                return next();
              }
            } else {
              return next();
            }
          }

          // Helpers para compatibilidade com handlers da Vercel
          (req as any).query = Object.fromEntries(parsedUrl.searchParams.entries());

          let bodyBuffer = '';
          req.on('data', (chunk) => {
            bodyBuffer += chunk;
          });

          await new Promise<void>((resolve) => {
            req.on('end', () => {
              if (bodyBuffer) {
                try {
                  (req as any).body = JSON.parse(bodyBuffer);
                } catch {
                  (req as any).body = bodyBuffer;
                }
              }
              resolve();
            });
          });

          (res as any).status = function (code: number) {
            res.statusCode = code;
            return res;
          };

          (res as any).json = function (data: any) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
            return res;
          };

          // Carrega dinamicamente o handler da API
          const imported = await import(`${filePath}?t=${Date.now()}`);
          const handler = imported.default || imported;

          if (typeof handler === 'function') {
            await handler(req, res);
          } else {
            next();
          }
        } catch (err: any) {
          console.error('[API Dev Error]', err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Erro interno no servidor da API.' }));
          }
        }
      });
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), apiDevMiddleware()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
      ],
    },
    server: {
      hmr: false,
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
    },
  };
});
