import {defineConfig, type Plugin} from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

const BASE = '/codenames/'

/** GitHub Pages redirects a bare directory path; the dev server does not. */
const baseRedirect = (): Plugin => ({
  name: 'base-redirect',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url ?? '/'
      if (url === BASE.slice(0, -1) || url === '/' || url.startsWith(`${BASE.slice(0, -1)}?`)) {
        res.writeHead(301, {location: BASE + url.slice(BASE.length - 1)})
        res.end()
        return
      }
      next()
    })
  }
})

export default defineConfig({
  base: BASE,
  plugins: [react(), tailwind(), baseRedirect()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    sourcemap: false
  }
})
