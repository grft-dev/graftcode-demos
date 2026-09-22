import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { h2cProxy } from './vite-graft-proxy.js'

const r = (p) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  plugins: [react(), h2cProxy()],
  base: process.env.GITHUB_ACTIONS
    ? `/${process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'graftcode-demos'}/`
    : '/',
  server: {
    proxy: {
      '/graft-ws': {
        target: 'ws://127.0.0.1:5000',
        ws: true,
        rewrite: () => '/ws',
      },
    },
    strictPort: true,
    port: 5173,
  },
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
