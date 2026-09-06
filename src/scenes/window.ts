/**
 * The night outside the garage window.
 *
 * One small canvas sized to the window opening, not hundreds of elements: a
 * field of stars that breathe, a slow drift of cloud, and — rarely — one
 * shooting star. It runs off the shared ticker and stops with the tab.
 *
 * The sky is fantasy weather. No location, no forecast API, nothing asked of
 * the visitor.
 */
import { ticker } from '@/systems/tick'
import { motion } from '@/systems/motion'

interface Star {
  x: number
  y: number
  r: number
  a: number
  tw: number
  ph: number
}

interface Shoot {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
}

export function mountWindowSky(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => undefined

  let stars: Star[] = []
  let w = 0
  let h = 0
  let dpr = 1
  let shoot: Shoot | null = null
  // Rare on purpose: one every 45-120s, never two at once.
  let nextShoot = 45000 + Math.random() * 75000
  let t = 0

  const size = (): void => {
    const r = canvas.getBoundingClientRect()
    if (!r.width || !r.height) return
    dpr = Math.min(devicePixelRatio || 1, 2)
    w = r.width
    h = r.height
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const count = Math.max(28, Math.min(90, Math.round((w * h) / 1400)))
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h * 0.78,
      r: 0.5 + Math.random() * 1.2,
      a: 0.3 + Math.random() * 0.6,
      tw: 0.1 + Math.random() * 0.16,
      ph: Math.random() * 6.28,
    }))
    draw()
  }

  const draw = (): void => {
    if (!w || !h) return
    ctx.clearRect(0, 0, w, h)

    // Two soft clouds, drifting slowly enough to notice only if you wait.
    ctx.save()
    for (let i = 0; i < 2; i++) {
      const cx = ((t / (i ? 96000 : 61000)) * w + i * w * 0.6) % (w * 1.6) - w * 0.3
      const cy = h * (0.18 + i * 0.22)
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.34)
      g.addColorStop(0, 'rgba(150,168,196,.16)')
      g.addColorStop(1, 'rgba(150,168,196,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(cx, cy, w * 0.34, h * 0.14, 0, 0, 6.283)
      ctx.fill()
    }
    ctx.restore()

    for (const s of stars) {
      const a = Math.max(0, s.a + Math.sin(t / 900 + s.ph) * s.tw)
      ctx.fillStyle = `rgba(232,238,250,${a.toFixed(3)})`
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, 6.283)
      ctx.fill()
    }

    if (shoot) {
      const p = shoot.life / shoot.max
      const fade = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85
      const tailX = shoot.x - shoot.vx * 34
      const tailY = shoot.y - shoot.vy * 34
      const g = ctx.createLinearGradient(tailX, tailY, shoot.x, shoot.y)
      g.addColorStop(0, 'rgba(240,244,255,0)')
      g.addColorStop(1, `rgba(244,246,255,${(0.75 * fade).toFixed(3)})`)
      ctx.strokeStyle = g
      ctx.lineWidth = 1.4
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(tailX, tailY)
      ctx.lineTo(shoot.x, shoot.y)
      ctx.stroke()
    }
  }

  size()
  const off: (() => void)[] = []
  const onResize = (): void => size()
  addEventListener('resize', onResize, { passive: true })
  off.push(() => removeEventListener('resize', onResize))
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => size())
    ro.observe(canvas)
    off.push(() => ro.disconnect())
  }

  if (!motion.reduced) {
    off.push(
      ticker.subscribe((info) => {
        t += info.delta
        if (shoot) {
          shoot.life += info.delta
          shoot.x += shoot.vx * (info.delta / 16.667)
          shoot.y += shoot.vy * (info.delta / 16.667)
          if (shoot.life >= shoot.max) shoot = null
        } else if (t >= nextShoot) {
          shoot = {
            x: -20,
            y: h * (0.06 + Math.random() * 0.3),
            vx: 3 + Math.random() * 2,
            vy: 1 + Math.random() * 0.8,
            life: 0,
            max: 800 + Math.random() * 700,
          }
          nextShoot = t + 45000 + Math.random() * 75000
        }
        draw()
      }, 12),
    )
  }

  return () => {
    for (const fn of off) fn()
    off.length = 0
  }
}
