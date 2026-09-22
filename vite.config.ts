import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the site from /typewriter/, not the root of the
  // domain, so the built files have to be linked with that prefix.
  base: '/typewriter/',
})
