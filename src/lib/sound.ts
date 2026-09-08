/**
 * Typewriter sounds, synthesised in the browser -- no audio files to load or
 * host. A key strike is a short burst of filtered noise (the "thock"), the
 * carriage return is a small bell.
 *
 * Browsers block audio until the user interacts with the page. That's fine
 * here: the first thing anyone does is press a key, which counts.
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
}

export function playStrike() {
  const ac = audio()
  if (!ac) return

  const now = ac.currentTime
  const length = 0.04
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * length), ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    // Noise that decays fast, so it reads as a mechanical click not a hiss.
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3
  }

  const source = ac.createBufferSource()
  source.buffer = buffer

  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  // Vary the pitch slightly per keystroke so repeated typing doesn't sound looped.
  filter.frequency.value = 1400 + Math.random() * 700
  filter.Q.value = 1.2

  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.18, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + length)

  source.connect(filter).connect(gain).connect(ac.destination)
  source.start(now)
  source.stop(now + length)
}

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
