import { defineConfig, type ViteDevServer } from "vite";
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
      configureServer(server: ViteDevServer) {
        server.middlewares.use((req: any, res: any, next: any) => {
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
    },
    {
      name: 'payments-dev-fallback',
      configureServer(server: ViteDevServer) {
        server.middlewares.use(async (req: any, res: any, next: any) => {
          if (req.url && req.url.startsWith('/api/payments')) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 600);
              const testPing = await fetch("http://localhost:3000/api/payments", {
                signal: controller.signal,
              }).catch(() => null);
              clearTimeout(timeoutId);

              if (testPing && testPing.ok) {
                return next();
              }
            } catch (err) {
              // Express server on port 3000 is not active
            }

            res.statusCode = 200;
            res.setHeader('content-type', 'application/json; charset=utf-8');

            if (req.url.includes('/create-subscription-order') || req.url.includes('/create-order')) {
              return res.end(JSON.stringify({
                success: true,
                order_id: `SUB-DEV-${Date.now()}`,
                gatewayOrderId: `SUB-DEV-${Date.now()}`,
                key_id: "rzp_test_TG7U7E97coCG1G",
                details: { keyId: "rzp_test_TG7U7E97coCG1G" }
              }));
            }

            return res.end(JSON.stringify({
              success: true,
              status: 'success',
              paymentId: `PAY-DEV-${Date.now()}`,
              invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
            }));
          }
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