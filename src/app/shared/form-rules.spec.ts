import { budgetAmountError, isPriceText, priceTextError, thaiMobileError } from './form-rules';

describe('form rules', () => {
  it('accepts a 10-digit Thai mobile and rejects abc or 123', () => {
    expect(thaiMobileError('0612345678')).toBeNull();
    expect(thaiMobileError('')).toBeNull();
    expect(thaiMobileError('abc')).toContain('10 หลัก');
    expect(thaiMobileError('123')).toContain('10 หลัก');
  });

  it('accepts open-budget amounts only inside 1 to 1000000', () => {
    expect(budgetAmountError('1')).toBeNull();
    expect(budgetAmountError('1000000')).toBeNull();
    expect(budgetAmountError('0')).toBeTruthy();
    expect(budgetAmountError('-5')).toBeTruthy();
    expect(budgetAmountError('abc')).toBeTruthy();
    expect(budgetAmountError('1000001')).toBeTruthy();
  });

  it('accepts a price number or range', () => {
    expect(isPriceText('40')).toBe(true);
    expect(isPriceText('40-80')).toBe(true);
    expect(isPriceText('40 – 80')).toBe(true);
    expect(isPriceText('-1')).toBe(false);
    expect(isPriceText('0')).toBe(false);
    expect(priceTextError('')).toContain('กรุณากรอกราคา');
    expect(priceTextError('abc')).toContain('ช่วงราคา');
    expect(priceTextError('-1')).toContain('ช่วงราคา');
    expect(isPriceText('1.5')).toBe(false);
    expect(isPriceText('80-40')).toBe(false);
    expect(priceTextError('1.5')).toContain('จำนวนเต็ม');
    expect(priceTextError('80-40')).toContain('จำนวนเต็ม');
  });
});
