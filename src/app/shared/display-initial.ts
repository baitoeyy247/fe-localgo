/** First letter/grapheme for avatars — skips Thai combining marks. */
export function displayInitial(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) {
    return '?';
  }

  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('th', { granularity: 'grapheme' });
    for (const { segment } of segmenter.segment(trimmed)) {
      if (/[\p{L}\p{N}]/u.test(segment)) {
        return segment;
      }
    }
  }

  for (const char of trimmed) {
    if (/[\p{L}\p{N}]/u.test(char)) {
      return char;
    }
  }

  return trimmed[0] ?? '?';
}
