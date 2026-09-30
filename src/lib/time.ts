/** "11:42 PM", in the reader's own locale. Used on the form and the receipt. */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}
