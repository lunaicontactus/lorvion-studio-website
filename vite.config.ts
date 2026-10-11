import { fileURLToPath, URL } from 'node:url'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { createServer, defineConfig, type Plugin, type ViteDevServer } from 'vite'
import { renderFooter, renderNav, renderPageIndex, sitemapXml } from './src/data/sitemap'
import type * as RenderModule from './src/render/pages'
import type * as ProjectsModule from './src/data/projects'

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

/** What src/render/pages.ts and the works' record export, as the prerender uses them. */
type Render = typeof RenderModule
type Projects = typeof ProjectsModule

/**
 * PHASE J: the content each page's script builds is written into the page at
 * build time too, from the same functions (src/render/pages.ts), so a page
 * read without running it — a search crawler, a link preview, the first
 * moments on a slow phone — has the whole page, not a title. The host gets
 * `data-prerendered`, and the script then only wires it up.
 *
 * The render module reads the site's records through the `@/` alias, which
 * this config file cannot resolve itself; Vite's own module loader does.
 */
function prerender(): Plugin {
  let dev: ViteDevServer | undefined
  let mods: Promise<{ r: Render; d: Projects }> | undefined
  const load = (server?: ViteDevServer): Promise<{ r: Render; d: Projects }> => {
    if (server) return Promise.all([server.ssrLoadModule('/src/render/pages.ts'), server.ssrLoadModule('/src/data/projects.ts')]).then(([r, d]) => ({ r: r as Render, d: d as Projects }))
    mods ??= (async () => {
      const s = await createServer({ configFile: false, root, appType: 'custom', logLevel: 'error',
        server: { middlewareMode: true, hmr: false, watch: null },
        // Two modules to load, not an app to serve: no dependency scan of every page.
        optimizeDeps: { noDiscovery: true, include: [] },
        resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } } })
      try {
        const [r, d] = await Promise.all([s.ssrLoadModule('/src/render/pages.ts'), s.ssrLoadModule('/src/data/projects.ts')])
        return { r: r as Render, d: d as Projects }
      } finally { await s.close() }
    })()
    return mods
  }
  /** Fill an empty host element, marked by `attr`, and mark it prerendered. */
  const fill = (html: string, attr: string, inner: string): string => {
    const re = new RegExp(`(<[a-z]+[^>]*\\s${attr}(?:="[^"]*")?)([^>]*>)(</[a-z]+>)`)
    if (!re.test(html)) throw new Error(`prerender: no empty ${attr} host`)
    return html.replace(re, (_m, open: string, rest: string, close: string) => `${open} data-prerendered${rest}${inner}${close}`)
  }
  return {
    name: 'eungarage-prerender',
    configureServer(server) { dev = server },
    transformIndexHtml: {
      order: 'pre',
      async handler(html) {
        const hosts = ['data-records', 'data-fallback-studio', 'data-press', 'data-records-index', 'data-records-shelves', 'data-works-detail']
        if (!hosts.some((h) => html.includes(` ${h}`))) return html
        const { r, d } = await load(dev)
        let out = html
        if (/\sdata-records[\s>]/.test(out)) out = fill(out, 'data-records', r.worksIndexHtml())
        if (out.includes(' data-fallback-studio')) out = fill(out, 'data-fallback-studio', r.studioHtml())
        if (out.includes(' data-press>')) out = fill(out, 'data-press', r.pressHtml())
        if (out.includes(' data-records-index')) out = fill(out, 'data-records-index', r.recordsIndexHtml())
        if (out.includes(' data-records-shelves')) out = fill(out, 'data-records-shelves', r.recordsShelvesHtml())
        const work = /data-works-detail="([^"]+)"/.exec(out)?.[1]
        if (work) {
          const p = d.getProject(work)
          if (!p) throw new Error(`prerender: no work ${work}`)
          const h = r.workHeroHtml(p)
          // The same four places the script puts them (src/ui/works.ts renderWork).
          // Functions, not replacement strings: a `$` in the content stays a `$`.
          out = out
            .replace(/<main[^>]*data-works-detail="[^"]+"/, (m) => `${m} data-prerendered`)
            .replace('<header class="work-hero" data-work-hero>', (m) => `${m}${h.figure}`)
            .replace('<div class="work-hero__text">', (m) => `${m}${h.kicker}`)
            .replace(/<h1 class="work-hero__title">[^<]*<\/h1>/, (m) => `${m}${h.line}`)
            .replace(/<\/div>(\s*<\/header>)/, (m) => `${h.tail}${m}`)
          if (!out.includes('<div data-work-body></div>') || !out.includes(' data-prerendered')) throw new Error(`prerender: ${work} hosts`)
          out = out.replace('<div data-work-body></div>', () => `<div data-work-body>${r.workBodyHtml(p)}</div>`)
        }
        return out
      },
    },
  }
}

export default defineConfig({
  appType: 'mpa',
  plugins: [siteShell(), prerender()],
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
