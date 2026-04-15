// src/ui/ScrollHelper.ts
// Reusable scroll inertia helper for panels with draggable content.
// Tracks velocity during drag and applies momentum/deceleration after release.

const FRICTION = 0.92;          // Per-frame velocity multiplier (lower = more friction)
const MIN_VELOCITY = 0.5;       // Stop inertia when velocity drops below this
const VELOCITY_SAMPLES = 5;     // Number of recent velocity samples to average

export class ScrollHelper {
  /** Current scroll offset */
  scrollY = 0;

  /** Is user currently dragging? */
  isDragging = false;

  /** Pointer Y at drag start */
  dragStartY = 0;

  /** scrollY at drag start (for absolute drag calculation) */
  dragStartScrollY = 0;

  /** Accumulated drag distance (for click vs drag detection) */
  totalDragDistance = 0;

  /** Current inertia velocity (px/frame at 60fps) */
  private velocity = 0;

  /** Whether inertia animation is running */
  private inertiaActive = false;

  /** Velocity sample buffer for averaging */
  private velocitySamples: number[] = [];
  private lastMoveTime = 0;
  private lastMoveY = 0;

  /** Clamp callback: receives tentative scrollY, returns clamped value */
  private clampFn: (scrollY: number) => number;

  /** Apply callback: called when scrollY changes (e.g. to update container position) */
  private applyFn: (scrollY: number) => void;

  /** Scene reference for update loop */
  private scene: Phaser.Scene;

  /** RAF handle */
  private rafId = 0;

  constructor(
    scene: Phaser.Scene,
    clampFn: (scrollY: number) => number,
    applyFn: (scrollY: number) => void,
  ) {
    this.scene = scene;
    this.clampFn = clampFn;
    this.applyFn = applyFn;
  }

  /** Call on pointerdown */
  onDragStart(pointerY: number): void {
    this.isDragging = true;
    this.dragStartY = pointerY;
    this.dragStartScrollY = this.scrollY;
    this.totalDragDistance = 0;
    this.velocity = 0;
    this.inertiaActive = false;
    this.velocitySamples = [];
    this.lastMoveTime = performance.now();
    this.lastMoveY = pointerY;
  }

  /** Call on pointermove. Returns true if drag threshold exceeded (8px). */
  onDragMove(pointerY: number): boolean {
    if (!this.isDragging) return false;

    const dy = pointerY - this.dragStartY;
    this.totalDragDistance = Math.abs(dy);
    this.scrollY = this.clampFn(this.dragStartScrollY + dy);
    this.applyFn(this.scrollY);

    // Track velocity
    const now = performance.now();
    const dt = now - this.lastMoveTime;
    if (dt > 0) {
      const v = (pointerY - this.lastMoveY) / (dt / 16.67); // normalize to 60fps frame
      this.velocitySamples.push(v);
      if (this.velocitySamples.length > VELOCITY_SAMPLES) {
        this.velocitySamples.shift();
      }
    }
    this.lastMoveTime = now;
    this.lastMoveY = pointerY;

    return this.totalDragDistance > 8;
  }

  /** Call on pointerup */
  onDragEnd(): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    // Calculate average velocity from recent samples
    if (this.velocitySamples.length > 0) {
      const avg = this.velocitySamples.reduce((a, b) => a + b, 0) / this.velocitySamples.length;
      this.velocity = avg;
    } else {
      this.velocity = 0;
    }

    // Start inertia if velocity is significant
    if (Math.abs(this.velocity) > MIN_VELOCITY) {
      this.inertiaActive = true;
      this.stepInertia();
    }
  }

  private stepInertia = (): void => {
    if (!this.inertiaActive || this.isDragging) {
      this.inertiaActive = false;
      return;
    }

    this.velocity *= FRICTION;
    if (Math.abs(this.velocity) < MIN_VELOCITY) {
      this.inertiaActive = false;
      return;
    }

    this.scrollY = this.clampFn(this.scrollY + this.velocity);
    this.applyFn(this.scrollY);

    this.rafId = requestAnimationFrame(this.stepInertia);
  };

  /** Stop any active inertia and drag (e.g. on panel switch or refresh) */
  stop(): void {
    this.inertiaActive = false;
    this.isDragging = false;
    this.velocity = 0;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  /** Reset scroll position */
  reset(): void {
    this.stop();
    this.scrollY = 0;
    this.isDragging = false;
  }

  /** Update clamp function (e.g. when content height changes) */
  setClampFn(fn: (scrollY: number) => number): void {
    this.clampFn = fn;
  }
}
