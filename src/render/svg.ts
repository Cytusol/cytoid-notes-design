import type { ClipShape, SceneNode, StrokeStyle, Transform } from '../core/scene'
import { TAU } from '../core/ease'

const n = (v: number) => +v.toFixed(3)

function transformAttr(t?: Transform): string {
  if (!t)
    return ''
  const parts: string[] = []
  if (t.x || t.y)
    parts.push(`translate(${n(t.x ?? 0)} ${n(t.y ?? 0)})`)
  if (t.rotate)
    parts.push(`rotate(${n((t.rotate * 180) / Math.PI)})`)
  const sx = (t.scaleX ?? 1) * (t.scale ?? 1)
  const sy = (t.scaleY ?? 1) * (t.scale ?? 1)
  if (sx !== 1 || sy !== 1)
    parts.push(`scale(${n(sx)} ${n(sy)})`)
  return parts.length ? ` transform="${parts.join(' ')}"` : ''
}

function strokeAttr(s: StrokeStyle): string {
  if (!s.stroke || !(s.strokeWidth ?? 1))
    return ' stroke="none"'
  let a = ` stroke="${s.stroke}" stroke-width="${n(s.strokeWidth ?? 1)}"`
  if (s.cap)
    a += ` stroke-linecap="${s.cap}"`
  if (s.join)
    a += ` stroke-linejoin="${s.join}"`
  if (s.dash?.length)
    a += ` stroke-dasharray="${s.dash.map(n).join(' ')}"`
  if (s.dashOffset)
    a += ` stroke-dashoffset="${n(s.dashOffset)}"`
  return a
}

function common(node: { opacity?: number, blend?: string }): string {
  let a = ''
  if (node.opacity !== undefined && node.opacity < 1)
    a += ` opacity="${n(Math.max(0, node.opacity))}"`
  if (node.blend === 'add')
    a += ` style="mix-blend-mode:plus-lighter"`
  return a
}

export function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const p = (a: number) => `${n(cx + Math.sin(a) * r)} ${n(cy - Math.cos(a) * r)}`
  const span = end - start
  if (Math.abs(span) >= TAU - 1e-6) {
    // two half arcs = full circle as a path (keeps butt caps sane)
    const m = start + span / 2
    return `M${p(start)}A${n(r)} ${n(r)} 0 0 1 ${p(m)}A${n(r)} ${n(r)} 0 0 1 ${p(end)}`
  }
  const large = Math.abs(span) > Math.PI ? 1 : 0
  const sweep = span >= 0 ? 1 : 0
  return `M${p(start)}A${n(r)} ${n(r)} 0 ${large} ${sweep} ${p(end)}`
}

function clipEl(c: ClipShape, id: string): string {
  let inner = ''
  if (c.type === 'circle')
    inner = `<circle cx="${n(c.cx ?? 0)}" cy="${n(c.cy ?? 0)}" r="${n(c.r)}"/>`
  else if (c.type === 'rect')
    inner = `<rect x="${n(c.x)}" y="${n(c.y)}" width="${n(c.w)}" height="${n(c.h)}" rx="${n(c.rx ?? 0)}"/>`
  else inner = `<polygon points="${c.points.map(([x, y]) => `${n(x)},${n(y)}`).join(' ')}"/>`
  return `<clipPath id="${id}">${inner}</clipPath>`
}

/** Serialise a scene node to SVG markup (no outer <svg>). */
export function toSVGMarkup(node: SceneNode): string {
  let clipId = 0
  const walk = (nd: SceneNode): string => {
    if ((nd.opacity ?? 1) <= 0.001)
      return ''
    switch (nd.type) {
      case 'circle':
        return `<circle cx="${n(nd.cx ?? 0)}" cy="${n(nd.cy ?? 0)}" r="${n(Math.max(0, nd.r))}" fill="${nd.fill ?? 'none'}"${strokeAttr(nd)}${common(nd)}/>`
      case 'arc':
        if (Math.abs(nd.end - nd.start) < 1e-4)
          return ''
        return `<path d="${arcPath(nd.cx ?? 0, nd.cy ?? 0, nd.r, nd.start, nd.end)}" fill="none"${strokeAttr(nd)}${common(nd)}/>`
      case 'rect':
        if (nd.w <= 0 || nd.h <= 0)
          return ''
        return `<rect x="${n(nd.x)}" y="${n(nd.y)}" width="${n(nd.w)}" height="${n(nd.h)}"${nd.rx ? ` rx="${n(Math.min(nd.rx, nd.w / 2, nd.h / 2))}"` : ''} fill="${nd.fill ?? 'none'}"${strokeAttr(nd)}${common(nd)}/>`
      case 'poly': {
        const tag = nd.closed ? 'polygon' : 'polyline'
        return `<${tag} points="${nd.points.map(([x, y]) => `${n(x)},${n(y)}`).join(' ')}" fill="${nd.fill ?? 'none'}"${strokeAttr(nd)}${common(nd)}/>`
      }
      case 'line':
        return `<line x1="${n(nd.x1)}" y1="${n(nd.y1)}" x2="${n(nd.x2)}" y2="${n(nd.y2)}"${strokeAttr(nd)}${common(nd)}/>`
      case 'group': {
        const body = nd.children.map(walk).join('')
        if (!body)
          return ''
        let defs = ''
        let clipAttr = ''
        if (nd.clip) {
          const id = `c${clipId++}`
          defs = `<defs>${clipEl(nd.clip, id)}</defs>`
          clipAttr = ` clip-path="url(#${id})"`
        }
        // transform on outer <g>, clip on inner so the clip is in local space
        return `<g${transformAttr(nd.transform)}${common(nd)}>${defs}${clipAttr ? `<g${clipAttr}>${body}</g>` : body}</g>`
      }
    }
  }
  return walk(node)
}

export interface SVGOptions {
  /** viewBox in scene coordinates: [x, y, w, h]. Default: centred square of `size`. */
  viewBox?: [number, number, number, number]
  size?: number
  width?: number
  height?: number
  background?: string
}

export function toSVG(node: SceneNode, o: SVGOptions = {}): string {
  const s = o.size ?? 256
  const vb = o.viewBox ?? [-s / 2, -s / 2, s, s]
  const w = o.width ?? vb[2]
  const h = o.height ?? vb[3]
  const bg = o.background ? `<rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" fill="${o.background}"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb.map(n).join(' ')}">${bg}${toSVGMarkup(node)}</svg>`
}
