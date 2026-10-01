/**
 * Typewriter sounds, synthesised in the browser -- no audio files to load or
 * host. Strikes, the space bar, the margin clunk and the tab ratchet are all
 * short bursts of filtered noise; the margin bell is a sine tone.
 *
 * Sound starts on. Browsers won't play audio before the visitor's first click
 * or keystroke, so the audio context is only made inside the first sound --
 * which is always a response to one. The toggle in the corner turns it off.
 */

let ctx: AudioContext | null = null
let muted = false

function audio(): AudioContext | null {
  if (muted) return null
  if (!ctx) {
    try {
      ctx = new AudioContext()
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function setMuted(next: boolean) {
  muted = next
  // Create the context inside the click that unmutes, so it's allowed to play.
  if (!next) audio()
}

/** A burst of noise that decays fast, so it reads as a mechanical click not a hiss. */
function click(
  ac: AudioContext,
  at: number,
  { length, frequency, q, volume }: { length: number; frequency: number; q: number; volume: number },
) {
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * length), ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3
  }

  const source = ac.createBufferSource()
  source.buffer = buffer

  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = frequency
  filter.Q.value = q

  const gain = ac.createGain()
  gain.gain.setValueAtTime(volume, at)
  gain.gain.exponentialRampToValueAtTime(0.001, at + length)

  source.connect(filter).connect(gain).connect(ac.destination)
  source.start(at)
  source.stop(at + length)
}

/** The type hitting the platen. */
export function playStrike() {
  const ac = audio()
  if (!ac) return
  // Vary the pitch slightly per keystroke so repeated typing doesn't sound looped.
  click(ac, ac.currentTime, { length: 0.04, frequency: 1400 + Math.random() * 700, q: 1.2, volume: 0.18 })
}

/** The space bar: the escapement only, no type, so lighter and lower. */
export function playSpace() {
  const ac = audio()
  if (!ac) return
  click(ac, ac.currentTime, { length: 0.03, frequency: 900, q: 0.8, volume: 0.07 })
}

/** A key pressed against the right margin: the key goes down onto a locked carriage. */
export function playClunk() {
  const ac = audio()
  if (!ac) return
  click(ac, ac.currentTime, { length: 0.07, frequency: 260, q: 1.5, volume: 0.22 })
}

/** The carriage running to the next tab stop: a quick run of ratchet teeth. */
export function playRatchet(teeth: number) {
  const ac = audio()
  if (!ac) return
  const count = Math.max(2, Math.min(teeth, 8))
  for (let i = 0; i < count; i++) {
    click(ac, ac.currentTime + i * 0.018, { length: 0.012, frequency: 2600, q: 2, volume: 0.06 })
  }
}

/** The carriage swept back: a slide, then the line-space click as the paper feeds. */
export function playReturn() {
  const ac = audio()
  if (!ac) return
  const now = ac.currentTime
  click(ac, now, { length: 0.28, frequency: 700, q: 0.6, volume: 0.05 })
  click(ac, now + 0.3, { length: 0.05, frequency: 1100, q: 1.4, volume: 0.16 })
}

/** The margin bell, seven columns before the end of the line. */
export function playBell() {
  const ac = audio()
  if (!ac) return

  const now = ac.currentTime
  const osc = ac.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = 1760

  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.09, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)

  osc.connect(gain).connect(ac.destination)
  osc.start(now)
  osc.stop(now + 0.5)
}
