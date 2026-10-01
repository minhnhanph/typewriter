import { COLS, layout } from '../core/text'

/**
 * A letter sent to a friend travels inside its own link, after the `#`.
 * Browsers never send that part of an address to the server, so the words go
 * from one person's browser to another's without the site ever seeing them.
 * There is still no server, and nothing to delete later: the link is the
 * only copy.
 */
const PREFIX = '#letter='

/** Far beyond any real letter. Stops a doctored link from unpacking into gigabytes. */
const MAX_BYTES = 64_000

const toBase64Url = (bytes: Uint8Array) => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromBase64Url = (text: string) =>
  Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

/** Packed small so a full page still makes a link chat apps will carry. */
async function compress(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** Unpacked a piece at a time, giving up the moment it grows past MAX_BYTES. */
async function decompress(bytes: Uint8Array): Promise<string | null> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > MAX_BYTES) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const joined = new Uint8Array(size)
  let at = 0
  for (const chunk of chunks) {
    joined.set(chunk, at)
    at += chunk.length
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(joined)
}

/** The link that carries this text. */
export async function letterLink(text: string): Promise<string> {
  const packed = await compress(text)
  return `${location.origin}${location.pathname}${PREFIX}${toBase64Url(packed)}`
}

/** Whether the page was opened from a letter link. Answers instantly, before unpacking. */
export const hasLetter = () => location.hash.startsWith(PREFIX)

/**
 * The letter in the current address, or null if there isn't one or it's damaged.
 * Laid out on the page grid, so a doctored link can't carry lines wider than
 * the paper.
 */
export async function readLetter(): Promise<string | null> {
  if (!hasLetter()) return null
  try {
    const raw = await decompress(fromBase64Url(location.hash.slice(PREFIX.length)))
    if (raw === null) return null
    // Only what a typewriter can put on paper: no control characters but line breaks.
    const clean = raw
      .replace(/\r\n?/g, '\n')
      .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '')
      .trimEnd()
    if (!clean.trim()) return null
    return layout(clean, COLS).lines.join('\n')
  } catch {
    return null
  }
}

/** Take the letter out of the address bar, so a refresh doesn't bring it back. */
export function forgetLetter() {
  history.replaceState(null, '', location.pathname + location.search)
}
