import * as THREE from 'three'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { CENTRE, PARTS, RADIUS, type Part, type Shape, type Vec3 } from './parts'

/**
 * The typewriter as a patent drawing. Every shape is filled flat with paper,
 * so it hides whatever is behind it, then outlined in ink: a heavy line round
 * its silhouette and a lighter one along its creases. No lights, no shading,
 * and an orthographic camera, because a drawing has no perspective.
 *
 * It renders only when something changes, never on a loop.
 */

// --- the feel ---

/** The view it opens on and comes back to on RESET. */
export const REST = { yaw: 30, pitch: 20 }
/** How far it can tilt, so it never ends up upside down. */
const PITCH_MIN = -10
const PITCH_MAX = 80
/** Opening: each part's slide, and the gap between one part starting and the next. */
const LAND_MS = 700
const STAGGER_MS = 130
/** Arrow-key turns ease over this long. */
const TURN_MS = 180
/** Line weights in pixels. Silhouettes heavier than creases, as an inker would draw them. */
const SILHOUETTE = 2.4
const SILHOUETTE_FINE = 1.3
const CREASE = 1.3
/** Room round the machine for the numbers, as a multiple of its radius. */
const MARGIN = 1.38
/** The ring the numbers sit on. */
const LABEL_RING = 1.16

export type Label = {
  id: string
  no: number
  /** Where the number sits, in canvas pixels. */
  x: number
  y: number
  /** Where its leader line touches the part. */
  ax: number
  ay: number
  /** Something is in front of the anchor: the leader is drawn dashed. */
  hidden: boolean
}

export type Scene = ReturnType<typeof createScene>

const rad = (deg: number) => (deg * Math.PI) / 180
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** The site's one easing curve, `--ease`: cubic-bezier(0.22, 0.61, 0.36, 1). */
function ease(t: number) {
  const [x1, y1, x2, y2] = [0.22, 0.61, 0.36, 1]
  const bez = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3
  // Solve x(s) = t by bisection; it's monotonic and this runs a few dozen times a frame.
  let lo = 0
  let hi = 1
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    if (bez(x1, x2, mid) < t) lo = mid
    else hi = mid
  }
  return bez(y1, y2, (lo + hi) / 2)
}

/** A colour token from base.css. */
const token = (name: string) =>
  new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(name).trim())

/** One shape as geometry, already moved into place. */
function geometryFor(shape: Shape): THREE.BufferGeometry {
  const m = new THREE.Matrix4()
  const at = (v?: Vec3) => new THREE.Vector3(...(v ?? [0, 0, 0]))
  const euler = (r?: Vec3) => new THREE.Euler(rad(r?.[0] ?? 0), rad(r?.[1] ?? 0), rad(r?.[2] ?? 0))
  let g: THREE.BufferGeometry

  switch (shape.kind) {
    case 'box':
      g = new THREE.BoxGeometry(...shape.size)
      m.compose(
        at(shape.at),
        new THREE.Quaternion().setFromEuler(euler(shape.rot)),
        new THREE.Vector3(1, 1, 1),
      )
      break
    case 'cylinder': {
      g = new THREE.CylinderGeometry(shape.radius, shape.radius, shape.length, 40)
      const r: Vec3 = shape.axis === 'x' ? [0, 0, 90] : shape.axis === 'z' ? [90, 0, 0] : [0, 0, 0]
      m.compose(at(shape.at), new THREE.Quaternion().setFromEuler(euler(r)), new THREE.Vector3(1, 1, 1))
      break
    }
    case 'torus':
      g = new THREE.TorusGeometry(shape.radius, shape.tube, 6, 28, shape.arc ?? Math.PI * 2)
      m.compose(
        at(shape.at),
        new THREE.Quaternion().setFromEuler(euler(shape.rot)),
        new THREE.Vector3(1, 1, 1),
      )
      break
    case 'sphere':
      g = new THREE.SphereGeometry(shape.radius, 28, 16)
      m.compose(at(shape.at), new THREE.Quaternion(), new THREE.Vector3(...(shape.scale ?? [1, 1, 1])))
      break
    case 'rod':
    case 'bar': {
      const from = at(shape.from)
      const dir = at(shape.to).sub(from)
      const length = dir.length()
      g =
        shape.kind === 'rod'
          ? new THREE.CylinderGeometry(shape.radius, shape.radius, length, 14)
          : new THREE.BoxGeometry(shape.width, length, shape.height)
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
      m.compose(from.addScaledVector(dir, length / 2), q, new THREE.Vector3(1, 1, 1))
      break
    }
  }
  g.applyMatrix4(m)
  return g
}

/**
 * The silhouette: the shape again, drawn from the inside in ink and pushed out
 * a few pixels along its normals. Where it peeks past the paper fill, it reads
 * as a heavy outline from every angle, round parts included.
 */
function hullMaterial(color: THREE.Color, resolution: THREE.Vector2, thickness: number) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      color: { value: color },
      thickness: { value: thickness },
      resolution: { value: resolution },
    },
    vertexShader: /* glsl */ `
      uniform float thickness;
      uniform vec2 resolution;
      void main() {
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec2 d = (projectionMatrix * vec4(normalMatrix * normal, 0.0)).xy * resolution;
        float l = length(d);
        if (l > 1e-5) clip.xy += d / l * thickness * 2.0 / resolution * clip.w;
        gl_Position = clip;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      void main() {
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }`,
  })
}

type Built = {
  part: Part
  group: THREE.Group
  fill: THREE.Mesh
  crease: LineSegments2
  hull: THREE.Mesh
  /** 0 = exploded, 1 = home. */
  landed: number
}

export function createScene(
  canvas: HTMLCanvasElement,
  opts: {
    reducedMotion: boolean
    onFrame: (labels: Label[]) => void
    /** The bell has landed: the opening is over. */
    onLanded: () => void
  },
) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera()
  const resolution = new THREE.Vector2(1, 1)
  const centre = new THREE.Vector3(...CENTRE)

  const paper = token('--paper')
  const ink = token('--ink')
  const ribbon = token('--ribbon')

  const fillMat = new THREE.MeshBasicMaterial({
    color: paper,
    // Pushed back a hair so the crease lines lying on its surface win.
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })
  /** One set of outline materials per state: plain ink, hovered in stamp blue, selected in ribbon red. */
  const inks = (color: THREE.Color) => ({
    crease: new LineMaterial({ color, linewidth: CREASE, resolution }),
    hull: hullMaterial(color, resolution, SILHOUETTE),
    hullFine: hullMaterial(color, resolution, SILHOUETTE_FINE),
  })
  const looks = { plain: inks(ink), hover: inks(token('--stamp-light')), selected: inks(ribbon) }
  type Look = keyof typeof looks
  function dress(b: { part: Part; crease: LineSegments2; hull: THREE.Mesh }, look: Look) {
    b.crease.material = looks[look].crease
    b.hull.material = b.part.fine ? looks[look].hullFine : looks[look].hull
  }

  const built: Built[] = PARTS.map((part) => {
    const shapes = part.shapes.map(geometryFor)
    const fillGeo = mergeGeometries(shapes)!
    const edges = new LineSegmentsGeometry().setPositions(
      shapes.flatMap((g) => Array.from(new THREE.EdgesGeometry(g, 25).getAttribute('position').array)),
    )
    // Smooth normals for the hull, so box corners push out diagonally
    // instead of splitting open.
    const hullGeo = mergeGeometries(
      shapes.map((g) => {
        const h = g.clone()
        h.deleteAttribute('normal')
        h.deleteAttribute('uv')
        const merged = mergeVertices(h)
        merged.computeVertexNormals()
        return merged
      }),
    )!
    const group = new THREE.Group()
    const fill = new THREE.Mesh(fillGeo, fillMat)
    fill.userData.part = part.id
    const line = new LineSegments2(edges, looks.plain.crease)
    const hull = new THREE.Mesh(hullGeo, part.fine ? looks.plain.hullFine : looks.plain.hull)
    group.add(hull, fill, line)
    scene.add(group)
    return { part, group, fill, crease: line, hull, landed: opts.reducedMotion ? 1 : 0 }
  })
  const fills = built.map((b) => b.fill)

  // --- view ---

  const view = { ...REST }
  let turn: { from: typeof REST; to: typeof REST; start: number } | null = null
  let size = { w: 1, h: 1 }
  /** Pixels per scene unit. */
  let scale = 1

  function placeCamera() {
    const y = rad(view.yaw)
    const p = rad(view.pitch)
    const dir = new THREE.Vector3(Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p))
    camera.position.copy(centre).addScaledVector(dir, 100)
    camera.up.set(0, 1, 0)
    camera.lookAt(centre)
    camera.updateMatrixWorld()
  }

  function resize(w: number, h: number) {
    size = { w: Math.max(1, w), h: Math.max(1, h) }
    renderer.setSize(size.w, size.h, false)
    resolution.set(size.w, size.h)
    const half = RADIUS * MARGIN
    const aspect = size.w / size.h
    const [hw, hh] = aspect >= 1 ? [half * aspect, half] : [half, half / aspect]
    Object.assign(camera, { left: -hw, right: hw, top: hh, bottom: -hh, near: 1, far: 300 })
    camera.updateProjectionMatrix()
    scale = size.h / (2 * hh)
    invalidate()
  }

  // --- opening ---

  let started = performance.now()
  let rang = opts.reducedMotion
  const bell = built.find((b) => b.part.id === 'bell')!
  const assembling = () => built.some((b) => b.landed < 1)

  function stepAssembly(now: number) {
    for (const b of built) {
      b.landed = clamp((now - started - b.part.order * STAGGER_MS) / LAND_MS, 0, 1)
    }
    if (!rang && bell.landed >= 1) {
      rang = true
      opts.onLanded()
    }
  }

  function skipAssembly() {
    if (!assembling()) return
    started = -Infinity
    invalidate()
  }

  // --- rendering ---

  let frame = 0
  function invalidate() {
    if (!frame) frame = requestAnimationFrame(draw)
  }

  function draw(now: number) {
    frame = 0
    if (assembling()) stepAssembly(now)
    if (turn) {
      const t = clamp((now - turn.start) / TURN_MS, 0, 1)
      const e = ease(t)
      view.yaw = turn.from.yaw + (turn.to.yaw - turn.from.yaw) * e
      view.pitch = turn.from.pitch + (turn.to.pitch - turn.from.pitch) * e
      if (t >= 1) turn = null
    }
    for (const b of built) {
      const k = 1 - ease(b.landed)
      b.group.position.set(b.part.exploded[0] * k, b.part.exploded[1] * k, b.part.exploded[2] * k)
    }
    placeCamera()
    renderer.render(scene, camera)
    opts.onFrame(labels())
    if (assembling() || turn) invalidate()
  }

  // --- numbers ---

  const raycaster = new THREE.Raycaster()

  /** Scene point to canvas pixels. */
  function toScreen(v: THREE.Vector3) {
    const p = v.clone().project(camera)
    return { x: ((p.x + 1) / 2) * size.w, y: ((1 - p.y) / 2) * size.h }
  }

  /** Is something other than this part between the camera and this point? */
  function occluded(world: THREE.Vector3, owner: string) {
    const p = world.clone().project(camera)
    raycaster.setFromCamera(new THREE.Vector2(p.x, p.y), camera)
    const distance = raycaster.ray.origin.distanceTo(world)
    const hit = raycaster.intersectObjects(fills, false)[0]
    return !!hit && hit.object.userData.part !== owner && hit.distance < distance - 0.3
  }

  function labels(): Label[] {
    const mid = toScreen(centre)
    const ring = RADIUS * LABEL_RING * scale
    const items = built
      .filter((b) => b.part.no !== undefined && b.part.anchor)
      .map((b) => {
        const world = new THREE.Vector3(...b.part.anchor!).add(b.group.position)
        const a = toScreen(world)
        return { b, world, a, angle: Math.atan2(a.y - mid.y, a.x - mid.x) }
      })
      .sort((p, q) => p.angle - q.angle)

    // Spread the numbers round the ring so no two sit on top of each other.
    const gap = (Math.PI * 2) / (items.length * 1.6)
    for (let pass = 0; pass < 24; pass++) {
      for (let i = 0; i < items.length; i++) {
        const cur = items[i]
        const next = items[(i + 1) % items.length]
        let d = next.angle - cur.angle
        if (i === items.length - 1) d += Math.PI * 2
        if (d < gap) {
          cur.angle -= (gap - d) / 2
          next.angle += (gap - d) / 2
        }
      }
    }

    return items.map(({ b, world, a, angle }) => ({
      id: b.part.id,
      no: b.part.no!,
      x: mid.x + Math.cos(angle) * ring,
      y: mid.y + Math.sin(angle) * ring,
      ax: a.x,
      ay: a.y,
      hidden: occluded(world, b.part.id),
    }))
  }

  // --- interaction ---

  function rotateBy(dYaw: number, dPitch: number, animate = false) {
    const to = {
      yaw: (turn?.to.yaw ?? view.yaw) + dYaw,
      pitch: clamp((turn?.to.pitch ?? view.pitch) + dPitch, PITCH_MIN, PITCH_MAX),
    }
    if (animate && !opts.reducedMotion) turn = { from: { ...view }, to, start: performance.now() }
    else {
      turn = null
      Object.assign(view, to)
    }
    invalidate()
  }

  /** Back to the opening view, and the opening plays again from the exploded parts. */
  function reset() {
    turn = null
    Object.assign(view, REST)
    if (!opts.reducedMotion) {
      for (const b of built) b.landed = 0
      started = performance.now()
      rang = false
    }
    invalidate()
  }

  /** The part under a canvas pixel, if any. */
  function pick(x: number, y: number): string | null {
    raycaster.setFromCamera(new THREE.Vector2((x / size.w) * 2 - 1, 1 - (y / size.h) * 2), camera)
    const hit = raycaster.intersectObjects(fills, false)[0]
    const id = hit?.object.userData.part as string | undefined
    // The frame and paper have nothing to say.
    return id && PARTS.find((p) => p.id === id)?.no !== undefined ? id : null
  }

  let selected: string | null = null
  let hovered: string | null = null
  function restyle() {
    for (const b of built) {
      dress(b, b.part.id === selected ? 'selected' : b.part.id === hovered ? 'hover' : 'plain')
    }
    invalidate()
  }
  function select(id: string | null) {
    selected = id
    restyle()
  }
  /** The part under the pointer, or the one named in the parts list. */
  function hover(id: string | null) {
    if (id === hovered) return
    hovered = id
    restyle()
  }

  function dispose() {
    cancelAnimationFrame(frame)
    for (const b of built) {
      b.fill.geometry.dispose()
      b.crease.geometry.dispose()
      b.hull.geometry.dispose()
    }
    fillMat.dispose()
    for (const set of Object.values(looks)) for (const m of Object.values(set)) m.dispose()
    renderer.dispose()
    // Browsers allow only a handful of live WebGL contexts; give this one back now.
    renderer.forceContextLoss()
  }

  started = performance.now()
  if (opts.reducedMotion) stepAssembly(Infinity)

  return {
    resize,
    rotateBy,
    reset,
    skipAssembly,
    pick,
    select,
    hover,
    dispose,
    get assembling() {
      return assembling()
    },
  }
}
