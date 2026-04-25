import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { writeServiceWorker } from './scripts/write-sw.ts'
import { nonBlockingCssLink } from './scripts/non-blocking-css.ts'

export default defineConfig({
  base: '/',
  // nonBlockingCssLink rewrites the HTML before writeServiceWorker so the
  // SW caches the rewritten copy.
  plugins: [react(), tailwindcss(), nonBlockingCssLink(), writeServiceWorker()],
  build: {
    // Vite walks the lazy-import graph and promotes any chunk reachable
    // from many lazy boundaries to a top-level <link rel="modulepreload">.
    // That defeats the point of lazy-loading large vendors — framer-motion
    // (~140 KB) and the Supabase SDK (~186 KB) end up downloaded with high
    // priority on every cold visit even though only post-login surfaces
    // need them. Filter them out so the cold critical path is just the
    // entry, react-vendor, and react-router.
    modulePreload: {
      resolveDependencies: (_filename, deps) =>
        deps.filter((d) => !/framer-motion|supabase|gesture/.test(d)),
    },
    rollupOptions: {
      output: {
        // Split heavy vendors into their own chunks so:
        //   - the main bundle stays small (boot + login path)
        //   - vendor chunks cache across deploys (their hash only changes
        //     when the library itself changes, not when app code does)
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('framer-motion')) return 'framer-motion';
          if (id.includes('@use-gesture')) return 'gesture';
          if (id.includes('date-fns')) return 'date-fns';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('react-router')) return 'react-router';
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          ) {
            return 'react-vendor';
          }
        },
      },
    },
  },
})
