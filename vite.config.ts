import { fileURLToPath, URL } from 'node:url'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import { renderFooter, renderNav, renderPageIndex, sitemapXml } from './src/data/sitemap'

const root = fileURLToPath(new URL('.', import.meta.url))

/**
 * Every .html at the repo root is an entry point, and every work's page
 * under works/.
 * The legal pages are linked from the LUNAI app, so their URLs are frozen:
 * discovering them instead of listing them means a new page can never be
 * forgotten, and an existing one can never silently stop being built.
 */
const htmlEntries = Object.fromEntries([
  ...readdirSync(root)
    .filter((f) => f.endsWith('.html'))
    .map((f) => [f.replace(/\.html$/, ''), resolve(root, f)]),
  // Each work's own page (works/<id>.html).
  ...readdirSync(resolve(root, 'works'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => [`works/${f.replace(/\.html$/, '')}`, resolve(root, 'works', f)]),
])

/** The works' ids, from their pages: the sitemap lists exactly what is built. */
const workIds = readdirSync(resolve(root, 'works')).filter((f) => f.endsWith('.html')).map((f) => f.replace(/\.html$/, ''))

/**
 * The site's shell, from one table (src/data/sitemap.ts): each page's
 * `<!--@nav-->`, `<!--@footer-->` and `<!--@pages-->` markers are filled as
 * plain HTML, and the sitemap is written from the same routes. A page that
 * still carries a marker after this has a typo, and the build says so.
 */
function siteShell(): Plugin {
  return {
    name: 'eungarage-site-shell',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const out = html
          .replace('<!--@nav-->', renderNav(ctx.path))
          .replace('<!--@footer-->', renderFooter(ctx.path))
          .replace('<!--@pages-->', renderPageIndex())
        if (/<!--@\w+-->/.test(out)) throw new Error(`${ctx.path}: unknown site-shell marker`)
        return out
      },
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(workIds) })
    },
    configureServer(server) {
      server.middlewares.use('/sitemap.xml', (_req, res) => {
        res.setHeader('content-type', 'application/xml')
        res.end(sitemapXml(workIds))
      })
    },
  }
}

export default defineConfig({
  appType: 'mpa',
  plugins: [siteShell()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    cssTarget: 'safari16',
    assetsInlineLimit: 2048,
    rollupOptions: { input: htmlEntries },
    reportCompressedSize: true,
  },
  server: { port: 5173 },
})
