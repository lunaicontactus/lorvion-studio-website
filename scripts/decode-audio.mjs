// Decode an audio file the OS tools cannot (Opus in M4A) with Chromium's decoder,
// and write 16-bit stereo WAV. Used by scripts/audio.sh for 밤의 작은 마법.m4a.
//   node scripts/decode-audio.mjs in.m4a out.wav
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
const src = readFileSync(process.argv[2]).toString('base64')
const b = await chromium.launch()
const page = await b.newPage()
const out = await page.evaluate(async (b64) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const ctx = new OfflineAudioContext(2, 48000, 48000)
  const buf = await ctx.decodeAudioData(bytes.buffer)
  const n = buf.length, ch = buf.numberOfChannels
  const pcm = new Int16Array(n * 2)
  const L = buf.getChannelData(0), R = buf.getChannelData(ch > 1 ? 1 : 0)
  for (let i = 0; i < n; i++) {
    pcm[i * 2] = Math.max(-1, Math.min(1, L[i])) * 32767
    pcm[i * 2 + 1] = Math.max(-1, Math.min(1, R[i])) * 32767
  }
  let s = ''
  const u8 = new Uint8Array(pcm.buffer)
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000))
  return { rate: buf.sampleRate, n, b64: btoa(s) }
}, src)
const data = Buffer.from(out.b64, 'base64')
const h = Buffer.alloc(44)
h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12)
h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(out.rate, 24)
h.writeUInt32LE(out.rate * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40)
writeFileSync(process.argv[3], Buffer.concat([h, data]))
console.log('decoded', out.n / out.rate, 's at', out.rate)
await b.close()
