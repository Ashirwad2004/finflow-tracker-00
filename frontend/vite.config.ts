import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/ - Force dev server reload & CSS cache invalidate: 2
export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 8080,
    strictPort: true,
    proxy: {
      '/api/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
    watch: {
      usePolling: false, // Prevents high CPU usage from aggressive file watching
    }
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    {
      name: 'utf8-charset-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const originalSetHeader = res.setHeader;
          res.setHeader = function (name: string, value: any) {
            if (name.toLowerCase() === 'content-type' && typeof value === 'string') {
              if (
                (value.startsWith('text/') || value.startsWith('application/javascript') || value.startsWith('application/json')) &&
                !value.toLowerCase().includes('charset')
              ) {
                value = `${value}; charset=utf-8`;
              }
            }
            return originalSetHeader.call(this, name, value);
          };
          next();
        });
      }
    }
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk splits
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          charting: ['recharts'],
          pdf: ['jspdf', 'jspdf-autotable'],
          supabase: ['@supabase/supabase-js'],
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-toast',
            'lucide-react',
            'framer-motion'
          ]
        },
      },
    },
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));