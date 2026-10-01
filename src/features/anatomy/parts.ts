import { ROWS } from '../writing/Keyboard'

/**
 * The typewriter as data: every part is a few simple shapes, a patent number,
 * and a note. The scene builds itself from this list, so changing a note or
 * adding a part means editing this file and nothing else.
 *
 * Units are roughly centimetres. +x is the machine's right, +y up, +z towards
 * the typist.
 */

export type Vec3 = [number, number, number]

export type Shape =
  /** `rot` is in degrees, applied x then y then z. */
  | { kind: 'box'; size: Vec3; at?: Vec3; rot?: Vec3 }
  | { kind: 'cylinder'; radius: number; length: number; axis?: 'x' | 'y' | 'z'; at?: Vec3 }
  | { kind: 'torus'; radius: number; tube: number; arc?: number; at?: Vec3; rot?: Vec3 }
  | { kind: 'sphere'; radius: number; scale?: Vec3; at?: Vec3 }
  /** A round rod between two points. */
  | { kind: 'rod'; from: Vec3; to: Vec3; radius: number }
  /** A flat bar between two points. */
  | { kind: 'bar'; from: Vec3; to: Vec3; width: number; height: number }

export type Part = {
  id: string
  /** The patent reference number. Structure with no number has no note. */
  no?: number
  name: string
  /** How the part works on a real machine. */
  real?: string
  /** How this site copies it. */
  site?: string
  shapes: Shape[]
  /** Where it starts in the opening, as an offset from home. */
  exploded: Vec3
  /** When it lands in the opening, earliest first. */
  order: number
  /** The point its number's leader line touches. */
  anchor?: Vec3
  /** Small, many-pieced parts get a lighter outline, or they ink solid. */
  fine?: boolean
}

// --- the keyboard deck: one sloping plane the keys stand on ---

const SLOPE = 21 // degrees, front edge lowest
const DECK_FROM = 4 // z of the back edge
const DECK_TO = 14
/** The top of the deck at depth z. */
const deckTop = (z: number) => 6.4 - Math.tan((SLOPE * Math.PI) / 180) * (z - DECK_FROM)

const PITCH = 2.15 // key spacing
const STEM = 1.5 // how far a cap stands above the deck
const rowZ = (row: number) => DECK_FROM + 0.8 + row * 2.05

type KeyAt = { id: string; x: number; y: number; z: number; command?: boolean }

/** Every key from the drawn keyboard, on the same rows, stagger and arc. */
const KEYS: KeyAt[] = ROWS.flatMap((row, r) =>
  row.keys.map((key, i) => {
    const centre = (row.keys.length - 1) / 2
    const offset = (i - centre) / centre
    const z = rowZ(r)
    return {
      id: key.id,
      command: key.command,
      x: (i - centre) * PITCH + (row.indent - 1) * PITCH * 0.46,
      // End keys ride higher, as in `arc()` in Keyboard.tsx.
      y: deckTop(z) + STEM + offset * offset * 0.33 * PITCH * 0.6,
      z,
    }
  }),
)

const keyShapes = (keys: KeyAt[]): Shape[] =>
  keys.flatMap((k) => [
    { kind: 'cylinder', radius: 0.85, length: 0.36, axis: 'y', at: [k.x, k.y, k.z] },
    { kind: 'rod', from: [k.x, deckTop(k.z) - 0.3, k.z], to: [k.x, k.y - 0.18, k.z], radius: 0.09 },
  ])

const keysFor = (test: (k: KeyAt) => boolean) => KEYS.filter(test)
const firstOf = (id: string) => KEYS.find((k) => k.id === id)!

// --- the typebasket: a fan of bars meeting at the printing point ---

/** Where every typebar lands: just in front of the platen. */
const PRINT: Vec3 = [0, 10.9, -0.7]
const BARS = 15
/** The fan lies in a plane tipped down and towards the typist. */
const FAN = [0, -0.72, 0.69] as const
const fanPoint = (angle: number, r: number): Vec3 => [
  PRINT[0] + Math.cos(angle) * r,
  PRINT[1] - 1.1 + FAN[1] * Math.sin(angle) * r,
  PRINT[2] + FAN[2] * Math.sin(angle) * r,
]
const barAngle = (i: number) => (Math.PI * (i + 1)) / (BARS + 1)

// --- the carriage, riding on top of the body ---

const PLATEN_Y = 12.7
const PLATEN_Z = -2.9
const PLATEN_R = 1.8
const PLATEN_HALF = 13
const REAR_BAR_TOP = 13.6
const RAIL: Vec3 = [0, REAR_BAR_TOP + 0.3, -6.9]

export const PARTS: Part[] = [
  {
    id: 'frame',
    name: 'Frame',
    order: 0,
    exploded: [0, -5, 0],
    shapes: [
      // Base plate.
      { kind: 'box', size: [30, 1.5, 26], at: [0, 0.75, 1.5] },
      // The tower that carries the carriage.
      { kind: 'box', size: [28, 8.6, 10], at: [0, 5.8, -6.5] },
      // Side cheeks round the keyboard well.
      { kind: 'box', size: [1, 5, 16], at: [-14.5, 4, 6.5] },
      { kind: 'box', size: [1, 5, 16], at: [14.5, 4, 6.5] },
      // The sloping deck the keys stand on.
      (() => {
        const mid = (DECK_FROM + DECK_TO) / 2
        const length = (DECK_TO - DECK_FROM) / Math.cos((SLOPE * Math.PI) / 180)
        const n = [Math.sin((SLOPE * Math.PI) / 180), Math.cos((SLOPE * Math.PI) / 180)]
        return {
          kind: 'box',
          size: [28, 0.8, length],
          at: [0, deckTop(mid) - n[1] * 0.4, mid - n[0] * 0.4],
          rot: [SLOPE, 0, 0],
        } satisfies Shape
      })(),
    ],
  },
  {
    id: 'paper',
    name: 'Paper',
    order: 9,
    exploded: [0, 9, 0],
    shapes: [
      { kind: 'box', size: [21, 12, 0.08], at: [0, PLATEN_Y + 6.6, PLATEN_Z - 1.6], rot: [-12, 0, 0] },
    ],
  },
  {
    id: 'platen',
    no: 10,
    name: 'Platen',
    real: 'The hard rubber roller the paper wraps around. The typebars strike against it, and its knobs turn it by hand to feed the paper or roll it back.',
    site: 'Scroll or drag the page to read back, like turning the knob. The next keystroke rolls it home.',
    order: 8,
    exploded: [0, 9, 3],
    anchor: [-7, PLATEN_Y + PLATEN_R, PLATEN_Z],
    shapes: [
      { kind: 'cylinder', radius: PLATEN_R, length: PLATEN_HALF * 2, axis: 'x', at: [0, PLATEN_Y, PLATEN_Z] },
      { kind: 'cylinder', radius: 0.4, length: 2.2, axis: 'x', at: [-14.6, PLATEN_Y, PLATEN_Z] },
      { kind: 'cylinder', radius: 0.4, length: 2.2, axis: 'x', at: [14.6, PLATEN_Y, PLATEN_Z] },
      { kind: 'cylinder', radius: 1.35, length: 1.3, axis: 'x', at: [-16.2, PLATEN_Y, PLATEN_Z] },
      { kind: 'cylinder', radius: 1.35, length: 1.3, axis: 'x', at: [16.2, PLATEN_Y, PLATEN_Z] },
    ],
  },
  {
    id: 'carriage',
    no: 12,
    name: 'Carriage',
    real: 'Carries the platen and slides one step to the left after every letter, so the printing point itself never moves.',
    site: 'The caret never moves; the paper and carriage do, both worked out from the column you are on.',
    order: 7,
    exploded: [0, 7, -5],
    anchor: [-12, REAR_BAR_TOP - 1, -5.2],
    shapes: [
      // The rear bar the whole carriage hangs from.
      { kind: 'box', size: [32, 2.6, 3.4], at: [0, REAR_BAR_TOP - 1.3, -6.9] },
      // End plates holding the platen.
      { kind: 'box', size: [0.6, 4, 6.4], at: [-13.6, PLATEN_Y - 0.2, -4.6] },
      { kind: 'box', size: [0.6, 4, 6.4], at: [13.6, PLATEN_Y - 0.2, -4.6] },
      // The rail the margin stops and bell ride on.
      { kind: 'rod', from: [-15.6, RAIL[1], RAIL[2]], to: [15.6, RAIL[1], RAIL[2]], radius: 0.3 },
    ],
  },
  {
    id: 'lever',
    no: 14,
    name: 'Carriage return lever',
    real: 'Pushed at the end of a line, it rolls the paper up one line and throws the carriage back to the left margin in one stroke.',
    site: 'Enter. The drawn lever swings when you press it.',
    order: 9,
    exploded: [-8, 5, 0],
    anchor: [-17.2, 17.2, 0.9],
    shapes: [
      { kind: 'box', size: [1.2, 1.4, 1.4], at: [-14.4, PLATEN_Y + 1.2, -3.6] },
      { kind: 'rod', from: [-14.4, PLATEN_Y + 1.6, -3.4], to: [-15.8, PLATEN_Y + 3.6, -1.2], radius: 0.28 },
      { kind: 'rod', from: [-15.8, PLATEN_Y + 3.6, -1.2], to: [-17.2, PLATEN_Y + 4.4, 0.6], radius: 0.28 },
      { kind: 'sphere', radius: 0.6, at: [-17.3, PLATEN_Y + 4.5, 0.8] },
    ],
  },
  {
    id: 'stops',
    no: 16,
    name: 'Margin stops',
    real: 'Two sliding stops on the rail. One sets where every line begins; the other is where the carriage locks at the end of a line.',
    site: 'The right margin is a hard stop at column 58. Only pasted text wraps.',
    order: 8,
    exploded: [0, 6, -5],
    anchor: [-13.5, RAIL[1] + 0.9, RAIL[2]],
    shapes: [
      { kind: 'box', size: [0.9, 1.3, 1.3], at: [-13.5, RAIL[1] + 0.2, RAIL[2]] },
      { kind: 'box', size: [0.9, 1.3, 1.3], at: [11, RAIL[1] + 0.2, RAIL[2]] },
    ],
  },
  {
    id: 'bell',
    no: 18,
    name: 'Bell',
    real: 'A small bell struck by the carriage a few characters before the margin, so you can finish the word before the carriage locks.',
    site: 'Rings 7 columns before the stop, if sound is on.',
    order: 10,
    exploded: [5, 7, -3],
    anchor: [14.2, RAIL[1] + 1.6, RAIL[2]],
    shapes: [
      { kind: 'cylinder', radius: 0.18, length: 1, axis: 'y', at: [14.2, RAIL[1] + 0.6, RAIL[2]] },
      { kind: 'sphere', radius: 1, scale: [1, 0.7, 1], at: [14.2, RAIL[1] + 1.2, RAIL[2]] },
    ],
  },
  {
    id: 'ribbon',
    no: 20,
    name: 'Ribbon and spools',
    real: 'An inked fabric ribbon wound from one spool to the other past the printing point, often black over red. The spools step on a little with each keystroke.',
    site: 'The red accent across this site is the red half of that ribbon. The drawn spools turn as you type.',
    order: 6,
    exploded: [0, 6, 2],
    anchor: [9, 10.9, -3],
    shapes: [-9, 9]
      .flatMap((x): Shape[] => [
        { kind: 'cylinder', radius: 2.1, length: 0.7, axis: 'y', at: [x, 10.45, -3] },
        { kind: 'cylinder', radius: 0.5, length: 1.3, axis: 'y', at: [x, 10.45, -3] },
      ])
      .concat([{ kind: 'box', size: [18, 0.6, 0.06], at: [0, 10.55, -0.9] }]),
  },
  {
    id: 'guide',
    fine: true,
    no: 22,
    name: 'Type guide',
    real: 'The small slotted guide at the printing point that steadies each typebar in its last instant, so every letter lands in the same place.',
    site: 'The one fixed point on the page where every letter lands.',
    order: 5,
    exploded: [0, 5, 5],
    anchor: [0, PRINT[1] + 0.5, PRINT[2]],
    shapes: [
      { kind: 'box', size: [0.5, 1, 0.3], at: [-0.5, PRINT[1], PRINT[2]] },
      { kind: 'box', size: [0.5, 1, 0.3], at: [0.5, PRINT[1], PRINT[2]] },
      { kind: 'box', size: [1.5, 0.3, 0.3], at: [0, PRINT[1] - 0.55, PRINT[2]] },
    ],
  },
  {
    id: 'typebars',
    fine: true,
    no: 24,
    name: 'Typebars',
    real: 'A fan of levers in the typebasket, each with a letter slug on its tip. A keystroke swings one up out of the fan to strike the ribbon against the platen.',
    site: 'Each letter lands 80 ms after its key goes down, as its bar arrives.',
    order: 4,
    exploded: [0, -3, 7],
    anchor: fanPoint(Math.PI / 2, 4),
    shapes: [
      ...Array.from({ length: BARS }, (_, i): Shape => ({
        kind: 'bar',
        from: fanPoint(barAngle(i), 1.6),
        to: fanPoint(barAngle(i), 6.2),
        width: 0.22,
        height: 0.12,
      })),
      // The slotted segment the bars pivot in.
      ...Array.from({ length: BARS + 1 }, (_, i): Shape => ({
        kind: 'bar',
        from: fanPoint((Math.PI * i) / (BARS + 1), 6.6),
        to: fanPoint((Math.PI * (i + 1)) / (BARS + 1), 6.6),
        width: 0.5,
        height: 0.5,
      })),
    ],
  },
  {
    id: 'keys',
    fine: true,
    no: 26,
    name: 'Keys',
    real: 'Each key is the end of a lever that throws its typebar. The rows stagger and step up towards the back, so every finger reaches its row.',
    site: 'Your own keyboard presses the drawn keys, on the same rows and the same arc.',
    order: 1,
    exploded: [0, 5, 6],
    anchor: (() => {
      const k = firstOf('g')
      return [k.x, k.y + 0.2, k.z]
    })(),
    shapes: keyShapes(keysFor((k) => k.id !== 'shift' && k.id !== 'backspace')),
  },
  {
    id: 'shift',
    fine: true,
    no: 28,
    name: 'Shift key',
    real: 'Lifts the whole typebasket a fraction, so the upper half of each slug strikes instead: capitals and the second symbol on each key.',
    site: 'Hold Shift, or tap a drawn shift key, and the caps show their upper symbols.',
    order: 2,
    exploded: [0, 5, 8],
    anchor: (() => {
      const k = firstOf('shift')
      return [k.x, k.y + 0.2, k.z]
    })(),
    shapes: keyShapes(keysFor((k) => k.id === 'shift')),
  },
  {
    id: 'backspacer',
    fine: true,
    no: 30,
    name: 'Back Spacer',
    real: 'Moves the carriage back one space. It never erased anything: you typed over your mistake, or reached for a rubber.',
    site: 'Here it erases, and steps back up a line. A deliberate kindness.',
    order: 2,
    exploded: [-4, 5, 6],
    anchor: (() => {
      const k = firstOf('backspace')
      return [k.x, k.y + 0.2, k.z]
    })(),
    shapes: keyShapes(keysFor((k) => k.id === 'backspace')),
  },
  {
    id: 'spacebar',
    no: 32,
    name: 'Space bar',
    real: 'A long bar under the thumbs that moves the carriage on one space without striking anything.',
    site: 'Space.',
    order: 3,
    exploded: [0, 2, 8],
    anchor: [4, deckTop(rowZ(4)) + STEM + 0.3, rowZ(4)],
    shapes: [
      { kind: 'box', size: [15, 0.55, 1.3], at: [0, deckTop(rowZ(4)) + STEM, rowZ(4)] },
      {
        kind: 'rod',
        from: [-6, deckTop(rowZ(4)) - 0.3, rowZ(4)],
        to: [-6, deckTop(rowZ(4)) + STEM - 0.27, rowZ(4)],
        radius: 0.15,
      },
      {
        kind: 'rod',
        from: [6, deckTop(rowZ(4)) - 0.3, rowZ(4)],
        to: [6, deckTop(rowZ(4)) + STEM - 0.27, rowZ(4)],
        radius: 0.15,
      },
    ],
  },
]

/** The parts with a number and a note, in number order: the legend. */
export const NUMBERED = PARTS.filter((p) => p.no !== undefined).sort((a, b) => a.no! - b.no!)

/** The middle of the assembled machine, and a radius that contains it. */
export const CENTRE: Vec3 = [0, 10, 1]
export const RADIUS = 22
