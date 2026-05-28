import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'

const r = (p) => fileURLToPath(new URL(p, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Map the private Graftcode packages to local stubs so the app builds and
    // runs without access to the private registries. Order matters: the
    // styles.css subpath must be matched before the bare package name.
    alias: [
      { find: '@graftcode/design-system/styles.css', replacement: r('./src/stubs/design-system.css') },
      { find: '@graftcode/design-system', replacement: r('./src/stubs/design-system.jsx') },
      { find: '@graft/nuget-EnergyPriceService', replacement: r('./src/stubs/graft.js') },
    ],
  },
})
