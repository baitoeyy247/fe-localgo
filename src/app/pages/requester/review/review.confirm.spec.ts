import { describe, expect, it } from 'vitest';
import { buildReviewConfirmMessage } from '../../../shared/confirm-copy';

describe('buildReviewConfirmMessage (NEW-1)', () => {
  it('shows star rating and comment, not "ไม่มีการเปลี่ยนแปลง"', () => {
    const msg = buildReviewConfirmMessage(
      { rating: 0, comment: '' },
      { rating: 5, comment: 'บริการดีมาก ตรงเวลา' },
    );
    expect(msg).toContain('คะแนน: ★ 5');
    expect(msg).toContain('ความคิดเห็น: บริการดีมาก ตรงเวลา');
    expect(msg).not.toContain('ไม่มีการเปลี่ยนแปลง');
  });

  it('truncates long comments with ellipsis', () => {
    const long = 'ก'.repeat(100);
    const msg = buildReviewConfirmMessage(null, { rating: 4, comment: long });
    expect(msg).toContain('…');
    expect(msg.length).toBeLessThan(long.length + 20);
  });

  it('shows rating when baseline is missing but stars selected', () => {
    const msg = buildReviewConfirmMessage(null, { rating: 3, comment: '' });
    expect(msg).toBe('คะแนน: ★ 3');
    expect(msg).not.toContain('ไม่มีการเปลี่ยนแปลง');
  });
});
