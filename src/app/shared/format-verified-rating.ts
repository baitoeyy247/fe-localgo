/** Verified rating line — matches provider home / search (`★ 4.5 (2 รีวิว)`). */
export function formatVerifiedRatingLine(
  average: number | string | null | undefined,
  count: number,
): string {
  if (!count || count <= 0) {
    return '';
  }
  const value = typeof average === 'number' ? average : Number(average);
  const display = Number.isFinite(value) ? String(value) : String(average ?? '');
  return `★ ${display} (${count} รีวิว)`;
}
