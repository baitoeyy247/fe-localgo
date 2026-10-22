import { describe, expect, it } from 'vitest';
import {
  bidSubmittedToast,
  destructiveSheetDismissCancelAppointment,
  destructiveSheetDismissDeleteArea,
  destructiveSheetDismissDeleteService,
  destructiveSheetDismissWithdrawBid,
  formatConfirmFieldLine,
} from './confirm-copy';

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

describe('destructive sheet dismiss labels (L-11)', () => {
  it('uses ไม่ลบ for delete area and delete service', () => {
    expect(destructiveSheetDismissDeleteArea).toBe('ไม่ลบ');
    expect(destructiveSheetDismissDeleteService).toBe('ไม่ลบ');
  });

  it('uses ไม่ถอน for withdraw bid', () => {
    expect(destructiveSheetDismissWithdrawBid).toBe('ไม่ถอน');
  });

  it('uses ไม่ยกเลิก for cancel appointment', () => {
    expect(destructiveSheetDismissCancelAppointment).toBe('ไม่ยกเลิก');
  });
});

describe('formatConfirmFieldLine (QA30 L-11)', () => {
  it('omits arrow for create flows', () => {
    expect(formatConfirmFieldLine('หัวข้อ', '', 'QA R30 A')).toBe('หัวข้อ: QA R30 A');
  });

  it('keeps arrow when editing', () => {
    expect(formatConfirmFieldLine('หัวข้อ', 'เดิม', 'ใหม่')).toBe('หัวข้อ: เดิม → ใหม่');
  });
});
