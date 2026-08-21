import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

export default defineConfig({
  base: '/codenames/',
  plugins: [react(), tailwind()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    sourcemap: false
  }
})
