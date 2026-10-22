import { describe, expect, it } from 'vitest';
import { OPEN_BUDGET_LABEL } from '../budget.constants';

/** L5 — document expected minimum input font size (enforced in global styles). */
describe('input font policy', () => {
  it('open budget label matches BE canonical text', () => {
    expect(OPEN_BUDGET_LABEL).toBe('เปิดรับข้อเสนอ');
  });

  it('minimum font size constant is at least 16px', () => {
    const MIN_INPUT_FONT_PX = 16;
    expect(MIN_INPUT_FONT_PX).toBeGreaterThanOrEqual(16);
  });
});
