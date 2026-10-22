import { formatPrice } from './format-price';

const OPEN_BUDGET_MARKERS = new Set(['เปิดรับราคา', 'เปิดรับข้อเสนอ']);

/** Budget line for display — never conflate with job status. */
export function formatBudgetDisplay(budget?: string | null): string | null {
  const raw = budget?.trim();
  if (!raw || OPEN_BUDGET_MARKERS.has(raw)) {
    return null;
  }
  return formatPrice(raw);
}
