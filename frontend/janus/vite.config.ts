import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  // server: {
  //   proxy: {
  //     '/api': 'http://localhost:3001'
  //   }
  // },
  plugins: [
    react(),
    tailwindcss(),
    wasm(),
    topLevelAwait(),
    nodePolyfills()
  ],
  optimizeDeps: {
    exclude: ['@syntect/wasm'],
  },
  define: {
    global: 'globalThis',
  },
})
