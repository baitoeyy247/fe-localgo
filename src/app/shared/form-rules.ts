export const OPEN_BUDGET = 'เปิดรับราคา';
export const BUDGET_MIN = 1;
export const BUDGET_MAX = 1_000_000;
export const REQUEST_TITLE_MAX = 100;
export const REQUEST_DETAILS_MAX = 1000;
export const SERVICE_TITLE_MAX = 80;

const THAI_MOBILE = /^0\d{9}$/;

export function thaiMobileError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (!THAI_MOBILE.test(trimmed)) {
    return 'กรุณากรอกเบอร์มือถือ 10 หลัก ขึ้นต้นด้วย 0 เช่น 06xxxxxxxx';
  }
  return null;
}

export function preferredTimeError(value: string, now = new Date()): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'กรุณาเลือกวันที่และเวลาที่ต้องการ';
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return 'กรุณาเลือกวันที่และเวลาที่ต้องการ';
  }
  const chosen = new Date(parsed);
  chosen.setSeconds(0, 0);
  const current = new Date(now);
  current.setSeconds(0, 0);
  if (chosen.getTime() < current.getTime()) {
    return 'วันที่และเวลาที่ต้องการต้องไม่เป็นเวลาในอดีต';
  }
  return null;
}

export function budgetAmountError(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return 'กรุณากรอกจำนวนเต็มตั้งแต่ 1 ถึง 1,000,000';
  }
  const amount = Number(trimmed);
  if (!Number.isSafeInteger(amount) || amount < BUDGET_MIN || amount > BUDGET_MAX) {
    return 'กรุณากรอกจำนวนเต็มตั้งแต่ 1 ถึง 1,000,000';
  }
  return null;
}

export function isPriceText(value: string): boolean {
  const trimmed = value.trim().replace(/บาท/g, '').replace(/\s/g, '');
  const match = trimmed.match(/^(\d+)(?:[-–—]|ถึง)(\d+)$|^(\d+)$/);
  if (!match) {
    return false;
  }
  const low = positiveAmount(match[1] ?? match[3]);
  if (low == null) {
    return false;
  }
  if (!match[2]) {
    return true;
  }
  const high = positiveAmount(match[2]);
  return high != null && low <= high;
}

export function priceTextError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'กรุณากรอกราคา';
  }
  if (!isPriceText(trimmed)) {
    return 'กรุณากรอกจำนวนเต็มหรือช่วงราคา เช่น 40 หรือ 40-80';
  }
  return null;
}

export function formatBaht(priceText: string | null | undefined): string {
  const trimmed = (priceText ?? '').trim();
  if (!trimmed) {
    return 'ติดต่อสอบถาม';
  }
  if (trimmed === OPEN_BUDGET || trimmed.includes('บาท')) {
    return trimmed;
  }
  return `${trimmed} บาท`;
}

function positiveAmount(text: string): number | null {
  if (!/^\d+$/.test(text)) {
    return null;
  }
  const amount = Number(text);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > BUDGET_MAX) {
    return null;
  }
  return amount;
}
