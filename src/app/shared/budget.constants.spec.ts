import { describe, expect, it } from 'vitest';
import {
  BUDGET_TYPE_OPEN,
  OPEN_BUDGET_LABEL,
  OPEN_BUDGET_LABEL_LEGACY,
} from './budget.constants';

describe('budget constants (N10)', () => {
  it('sends stable open budget code with canonical Thai label', () => {
    const payload = {
      budgetType: BUDGET_TYPE_OPEN,
      budgetText: OPEN_BUDGET_LABEL,
    };
    expect(payload.budgetType).toBe('open');
    expect(payload.budgetText).toBe('เปิดรับข้อเสนอ');
    expect(OPEN_BUDGET_LABEL_LEGACY).toBe('เปิดรับราคา');
  });
});
