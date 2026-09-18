// Legacy brand residue, searched for rather than looked for.
//
//   node scripts/brand-scan.mjs          # source, public, pages
//   node scripts/brand-scan.mjs dist     # also the built site
//
// Two checks. Text: no legacy brand term in anything that can reach a visitor
// (HTML, TS/JS, CSS, JSON, manifest, SVG, webmanifest, txt, xml — including
// alt, aria, meta and comments that survive into output). Bytes: no file the
// site serves is one of the retired logos or icons, by SHA-256, whatever it
// is called now. Exits non-zero on any hit, so CI can run it.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative, extname } from 'node:path'

export const LEGACY_TERMS = [/lorvion/i, /lorvionstudio@gmail\.com/i, /orbital\s+garage/i, /worlds beyond the ordinary/i]

/** Retired brand files, by content. Hashed from git history (see WORLD_2_BASELINE.md). */
export const LEGACY_HASHES = new Map([
  ['f180340fb273cd1de11f4f822f8080fbb63a6f2e62033ca67fcf4f3feb12b98f', 'lorvion-lockup.png'],
  ['5f708db36eb527e7f3a5fb2c04ce10e1d8bb2d01c8b0e0d6c88acc8e53ff22c0', 'lorvion-mark.png'],
  ['a89081640945b9ad7a6ef40889c74d3abd0d7274b9f87ea564dc2d7110b2016d', 'lorvion-wordmark.png'],
  ['eb49430586c6132cb8c54ecea3a0ce272eec2fe84bb93e3416ea4fc06c9327d1', 'eungarage_logo_lockup.png (v01 flat mark)'],
  ['3c70a23643a4f6f85da29e4639d12ac3499e05e1e3d309ae48d82b8ec99d43ad', 'eungarage_mark.png (v01)'],
  ['b322429533f835dfd3a2857d183a3663bd07ef3596a79bdb3099e2c7d7bf564e', 'eungarage_wordmark.png (v01)'],
  ['28deb70f6ddb89783fa940d8bca2222697a777a15674516f48560a5308b2b882', 'favicon/icon-512 (v01)'],
  ['a63e788752d830e575f379320b22006c08b7d3e0a2acaf750914b81ffc18024b', 'apple-touch-icon (v01)'],
  ['d195b5c4ff78bfbed3dfa97f9f91837ba2107117f07eb4b75251aab682ca33a0', 'icon-192 (v01)'],
  ['433ea1243a7846555af181588390f4e4fab344c1fb66291475a0cd1267d0394d', 'icon-maskable-512 (v01)'],
  ['a07cea9501ff010baac2657f60f2b2dfdaee94463b94e561e67ea5c2c68dbc3a', 'og-image.jpg (v01)'],
])

const TEXT = new Set(['.html', '.ts', '.js', '.mjs', '.css', '.json', '.webmanifest', '.svg', '.txt', '.xml', '.map'])

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* walk(p)
    else yield p
  }
}

export function scan(root, targets) {
  const hits = []
  for (const target of targets) {
    const base = join(root, target)
    if (!existsSync(base)) continue
    const files = statSync(base).isDirectory() ? [...walk(base)] : [base]
    for (const file of files) {
      const buf = readFileSync(file)
      const hash = createHash('sha256').update(buf).digest('hex')
      if (LEGACY_HASHES.has(hash)) hits.push(`${relative(root, file)}: retired brand file (${LEGACY_HASHES.get(hash)})`)
      if (!TEXT.has(extname(file))) continue
      const text = buf.toString('utf8')
      for (const term of LEGACY_TERMS) {
        const m = text.match(term)
        if (m) hits.push(`${relative(root, file)}: "${m[0]}"`)
      }
    }
  }
  return hits
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.cwd()
  const pages = readdirSync(root).filter((f) => f.endsWith('.html'))
  const targets = ['src', 'public', ...pages, ...(process.argv.includes('dist') ? ['dist'] : [])]
  const hits = scan(root, targets)
  for (const h of hits) console.log(`  ${h}`)
  console.log(hits.length ? `${hits.length} legacy brand hit(s)` : `legacy brand scan clean (${targets.join(', ')})`)
  process.exitCode = hits.length ? 1 : 0
}
