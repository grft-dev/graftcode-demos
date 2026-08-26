import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'

const r = (p) => fileURLToPath(new URL(p, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // @graftcode/design-system lives in a private registry — use local stubs.
    // @graft/nuget-EnergyPriceService is now installed from the Graftcode registry.
    alias: [
      { find: '@graftcode/design-system/styles.css', replacement: r('./src/stubs/design-system.css') },
      { find: '@graftcode/design-system', replacement: r('./src/stubs/design-system.jsx') },
      // hypertube-nodejs-sdk imports randomUUID from 'crypto' (Node built-in).
      // Shim it to the browser Web Crypto API so Vite can bundle it.
      { find: 'crypto', replacement: r('./src/stubs/crypto-browser.js') },
    ],
  },
})
