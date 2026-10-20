export const OPEN_BUDGET = 'เปิดรับราคา';
export const BUDGET_MIN = 1;
export const BUDGET_MAX = 1_000_000;

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
  const match = trimmed.match(/^(\d+(?:\.\d+)?)(?:[-–—]|ถึง)(\d+(?:\.\d+)?)$|^(\d+(?:\.\d+)?)$/);
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
    return 'กรุณากรอกตัวเลขหรือช่วงราคา เช่น 40 หรือ 40-80';
  }
  return null;
}

function positiveAmount(text: string): number | null {
  if (!/^\d+(?:\.\d+)?$/.test(text)) {
    return null;
  }
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount <= 0 || amount > BUDGET_MAX) {
    return null;
  }
  return amount;
}
