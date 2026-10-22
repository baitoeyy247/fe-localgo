import { describe, expect, it } from 'vitest';
import { OPEN_BUDGET_LABEL } from '../budget.constants';

/** L5 — price input policy (mirrored in styles.scss .input-price). */
export const PRICE_INPUT_MIN_FONT_PX = 16;
export const PRICE_INPUT_MIN_HEIGHT_PX = 52;

describe('input font policy', () => {
  it('open budget label matches BE canonical text', () => {
    expect(OPEN_BUDGET_LABEL).toBe('เปิดรับข้อเสนอ');
  });

  it('documents minimum price input typography for L5', () => {
    expect(PRICE_INPUT_MIN_FONT_PX).toBeGreaterThanOrEqual(16);
    expect(PRICE_INPUT_MIN_HEIGHT_PX).toBeGreaterThanOrEqual(52);
  });
});
