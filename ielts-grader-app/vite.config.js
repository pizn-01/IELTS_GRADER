import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const gradingServiceUrl = env.VITE_GRADING_SERVICE_URL || 'https://ielts-grader-backend.fly.dev';

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
    },
    server: {
      proxy: {
        // In dev, /api/* → Fly.io grading backend (keeps GRADING_SECRET safe from CORS issues)
        '/api': {
          target: gradingServiceUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          secure: true,
        },
      },
    },
  };
});
