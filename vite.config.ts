import { fileURLToPath, URL } from 'node:url'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const root = fileURLToPath(new URL('.', import.meta.url))

/**
 * Every .html at the repo root is an entry point.
 * The legal pages are linked from the LUNAI app, so their URLs are frozen:
 * discovering them instead of listing them means a new page can never be
 * forgotten, and an existing one can never silently stop being built.
 */
const htmlEntries = Object.fromEntries(
  readdirSync(root)
    .filter((f) => f.endsWith('.html'))
    .map((f) => [f.replace(/\.html$/, ''), resolve(root, f)]),
)

export default defineConfig({
  appType: 'mpa',
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
