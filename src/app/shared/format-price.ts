/** Display price text with Thai baht unit when missing. */
export function formatPrice(value?: string | null): string {
  const raw = (value ?? '').trim();
  if (!raw) {
    return '—';
  }
  if (/บาท|฿/u.test(raw)) {
    return raw;
  }
  if (/^\d+([–-]\d+)?$/u.test(raw)) {
    return `${raw} บาท`;
  }
  return raw;
}
