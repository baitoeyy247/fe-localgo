/** M-5: mirrors BE FieldRules.MaxLength limits. */
export const FIELD_LIMITS = {
  appointmentAddress: 500,
  appointmentNote: 2000,
  requestAddress: 500,
  branchName: 120,
  branchAddress: 500,
  serviceName: 80,
  serviceDescription: 2000,
  servicePriceText: 100,
  rejectReason: 500,
  providerName: 120,
  providerDescription: 2000,
  providerLine: 64,
  bidDetail: 1000,
  requestTitle: 100,
} as const;

export const PRICE_MIN = 1;
export const PRICE_MAX = 1_000_000;
export const PRICE_ERROR = 'ราคาต้องเป็นจำนวนเต็ม 1–1,000,000 บาท';

/** Integer 1–1,000,000 (blocks "abc", "-100", "0", "1.5"). Empty string → null (not validated). */
export function priceError(raw: string | number | null | undefined): string | null {
  const text = String(raw ?? '').replace(/,/g, '').trim();
  if (!text) {
    return null;
  }
  if (!/^\d+$/.test(text)) {
    return PRICE_ERROR;
  }
  const n = Number(text);
  return n >= PRICE_MIN && n <= PRICE_MAX ? null : PRICE_ERROR;
}

export function maxLengthMessage(label: string, max: number): string {
  return `${label}ต้องไม่เกิน ${max} ตัวอักษร`;
}
