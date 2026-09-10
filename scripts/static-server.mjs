/**
 * A static server that caches the way the live host does.
 *
 * `vite preview` sends `Cache-Control: no-cache` on everything, which makes
 * every sprite frame revalidate on every play — a thousand requests in two
 * minutes for four hundred frames, and a transfer figure five times the size
 * of what is actually on disk. GitHub Pages, which is what serves
 * eungarage.com, sends `max-age=600`. Measuring against the wrong one gives a
 * number that describes the harness.
 *
 *     node scripts/static-server.mjs [port] [dir]
 */
import { createServer } from 'node:http'
import { createReadStream, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'

const port = Number(process.argv[2] ?? 4180)
const root = process.argv[3] ?? 'dist'
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon',
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  let file = join(root, normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, ''))
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html')
  } catch {
    res.writeHead(404).end('not found')
    return
  }
  try {
    const s = statSync(file)
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      'content-length': s.size,
      // What GitHub Pages sends.
      'cache-control': 'max-age=600',
      etag: `"${s.size}-${s.mtimeMs}"`,
    })
    createReadStream(file).pipe(res)
  } catch {
    res.writeHead(404).end('not found')
  }
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port} with max-age=600`))
