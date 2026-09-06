/**
 * The visitor's viewpoint.
 *
 * There is no avatar: the camera *is* the visitor. It holds a position in world
 * space, is clamped so it can never look past the walls, and eases toward its
 * target so dragging feels like turning your head rather than scrubbing a
 * timeline. When the world is smaller than the viewport on an axis it centres
 * on that axis instead of clamping to zero.
 */
export interface CameraBounds {
  readonly worldWidth: number
  readonly worldHeight: number
  readonly viewWidth: number
  readonly viewHeight: number
}

export class Camera {
  /** Where the camera is looking, in world coordinates (centre of view). */
  x = 0
  y = 0
  private targetX = 0
  private targetY = 0
  private bounds: CameraBounds = { worldWidth: 1, worldHeight: 1, viewWidth: 1, viewHeight: 1 }
  /** 0 snaps, 1 never arrives. */
  private readonly ease: number

  constructor(ease = 0.14) {
    this.ease = ease
  }

  resize(bounds: CameraBounds): void {
    this.bounds = bounds
    this.targetX = this.clampX(this.targetX)
    this.targetY = this.clampY(this.targetY)
    this.x = this.clampX(this.x)
    this.y = this.clampY(this.y)
  }

  /** Jump with no easing — opening position, or a fast-travel arrival. */
  snapTo(x: number, y: number): void {
    this.targetX = this.clampX(x)
    this.targetY = this.clampY(y)
    this.x = this.targetX
    this.y = this.targetY
  }

  moveTo(x: number, y: number): void {
    this.targetX = this.clampX(x)
    this.targetY = this.clampY(y)
  }

  moveBy(dx: number, dy: number): void {
    this.moveTo(this.targetX + dx, this.targetY + dy)
  }

  /** Advance the easing. `dt` in ms; the step is frame-rate independent. */
  update(dt: number): boolean {
    const k = 1 - Math.pow(1 - this.ease, dt / 16.667)
    const nx = this.x + (this.targetX - this.x) * k
    const ny = this.y + (this.targetY - this.y) * k
    const moved = Math.abs(nx - this.x) > 0.01 || Math.abs(ny - this.y) > 0.01
    this.x = moved ? nx : this.targetX
    this.y = moved ? ny : this.targetY
    return moved
  }

  /** Top-left of the visible window, in world coordinates. */
  get viewX(): number {
    return this.x - this.bounds.viewWidth / 2
  }
  get viewY(): number {
    return this.y - this.bounds.viewHeight / 2
  }

  /** World point -> screen point. */
  toScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: wx - this.viewX, y: wy - this.viewY }
  }
  /** Screen point -> world point. */
  toWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: sx + this.viewX, y: sy + this.viewY }
  }

  private clampX(v: number): number {
    const { worldWidth, viewWidth } = this.bounds
    if (worldWidth <= viewWidth) return worldWidth / 2
    return Math.min(Math.max(v, viewWidth / 2), worldWidth - viewWidth / 2)
  }
  private clampY(v: number): number {
    const { worldHeight, viewHeight } = this.bounds
    if (worldHeight <= viewHeight) return worldHeight / 2
    return Math.min(Math.max(v, viewHeight / 2), worldHeight - viewHeight / 2)
  }
}
