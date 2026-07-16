import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { h2cProxy } from "./vite-graft-proxy.js";

export default defineConfig({
  plugins: [react(), basicSsl(), nodePolyfills(), h2cProxy()],
  server: {
    https: true,
    proxy: {},
    strictPort: true,
    port: 5173,
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      crypto: "/src/shims/crypto.js",
    },
  },
  optimizeDeps: {
    // Local file: dependency; avoid stale pre-bundled copies after logger rebuilds.
    exclude: ["@graftcode/browser-logger", "@graft/nuget-cityweatherservice", "@graft/nuget-userservice"],
  },
});
