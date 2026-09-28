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
      // gRPC-Web (Connect) from the browser — same-origin avoids CORS; backend is HTTP/1.1-capable.
      '/grpc': {
        target: 'http://127.0.0.1:5005',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/grpc/, ''),
      },
    },
    strictPort: true,
    port: 5173,
  },
  resolve: {
    // @graftcode/design-system lives in a private registry — use local stubs.
    // @graft/nuget-energypriceservice — Graftcode registry (see .npmrc).
    alias: [
      { find: '@graftcode/design-system/styles.css', replacement: r('./src/stubs/design-system.css') },
      { find: '@graftcode/design-system', replacement: r('./src/stubs/design-system.jsx') },
      // hypertube-nodejs-sdk imports randomUUID from 'crypto' (Node built-in).
      // Shim it to the browser Web Crypto API so Vite can bundle it.
      { find: 'crypto', replacement: r('./src/stubs/crypto-browser.js') },
    ],
  },
})
