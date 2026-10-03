/* Easing & timeline helpers. All functions are pure and engine-portable. */

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const clamp01 = (v: number) => clamp(v, 0, 1)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Remap `t` from [a, b] to [0, 1] (clamped). The basic keyframe building block. */
export function seg(t: number, a: number, b: number): number {
  if (b <= a)
    return t >= b ? 1 : 0
  return clamp01((t - a) / (b - a))
}

/** 0 → 1 → 0 bump over [a, b] (sin shaped). */
export function bump(t: number, a: number, b: number): number {
  const x = seg(t, a, b)
  return x <= 0 || x >= 1 ? 0 : Math.sin(x * Math.PI)
}

export type Ease = (t: number) => number

export const linear: Ease = t => t
export const inQuad: Ease = t => t * t
export const outQuad: Ease = t => 1 - (1 - t) * (1 - t)
export const inOutQuad: Ease = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
export const inCubic: Ease = t => t * t * t
export const outCubic: Ease = t => 1 - (1 - t) ** 3
export const inOutCubic: Ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
export const outQuart: Ease = t => 1 - (1 - t) ** 4
export const outExpo: Ease = t => (t >= 1 ? 1 : 1 - 2 ** (-10 * t))
export const inExpo: Ease = t => (t <= 0 ? 0 : 2 ** (10 * t - 10))
export function outBack(t: number, s = 1.70158): number {
  const c3 = s + 1
  return 1 + c3 * (t - 1) ** 3 + s * (t - 1) ** 2
}

/** Ease applied on a sub-range: `ease(seg(t, a, b))`. */
export const ranged = (t: number, a: number, b: number, ease: Ease = linear) => ease(seg(t, a, b))

/** Deterministic PRNG (mulberry32) — effects must render identically in every frame bake. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const TAU = Math.PI * 2
