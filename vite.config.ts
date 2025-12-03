import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  if (!env.PORT) {
    throw new Error('PORT environment variable is required. Please set it in your .env file.');
  }
  
  const port = parseInt(env.PORT, 10);
  
  if (isNaN(port)) {
    throw new Error(`PORT environment variable must be a valid number. Got: ${env.PORT}`);
  }

  if (!env.VITE_NETVIEW_API_URL) {
    throw new Error('VITE_NETVIEW_API_URL environment variable is required. Please set it in your .env file.');
  }

  const apiUrl = env.VITE_NETVIEW_API_URL;

  return {
    plugins: [
      react(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port: port,
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
        },
        '/gateways': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
        },
        '/health': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
