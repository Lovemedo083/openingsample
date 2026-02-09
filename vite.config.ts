import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { registerGolmokRoutes } from './server/golmokApi';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api/marble': {
            target: 'https://api.worldlabs.ai',
            changeOrigin: true,
            rewrite: (p: string) => p.replace(/^\/api\/marble/, '/marble/v1'),
          },
          '/cdn/marble': {
            target: 'https://cdn.marble.worldlabs.ai',
            changeOrigin: true,
            rewrite: (p: string) => p.replace(/^\/cdn\/marble/, ''),
          },
          '/api/commerce': {
            target: 'https://apis.data.go.kr',
            changeOrigin: true,
            rewrite: (p: string) => p.replace(/^\/api\/commerce/, ''),
          },
        },
      },
      plugins: [
        react(),
        {
          name: 'golmok-api',
          configureServer(server) {
            registerGolmokRoutes(server.middlewares);
          },
        },
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
            scanner: path.resolve(__dirname, 'scanner.html'),
            furniture: path.resolve(__dirname, 'furniture.html'),
            commerce: path.resolve(__dirname, 'commerce.html'),
            'commerce-report': path.resolve(__dirname, 'commerce-report.html'),
            'golmok-live': path.resolve(__dirname, 'golmok-live.html'),
          },
        },
      },
    };
});
