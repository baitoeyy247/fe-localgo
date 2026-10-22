import { describe, expect, it } from 'vitest';
import { bidSubmittedToast } from './confirm-copy';

describe('bidSubmittedToast (QA28 L-1)', () => {
  it('formats new bid submission with price', () => {
    expect(bidSubmittedToast('1,500', false)).toBe('ส่งข้อเสนอ 1,500 บาทแล้ว');
  });

  it('formats bid update with price', () => {
    expect(bidSubmittedToast('2,000', true)).toBe('อัปเดตข้อเสนอเป็น 2,000 บาทแล้ว');
  });

  it('trims price text', () => {
    expect(bidSubmittedToast(' 800 ', false)).toBe('ส่งข้อเสนอ 800 บาทแล้ว');
  });
});
