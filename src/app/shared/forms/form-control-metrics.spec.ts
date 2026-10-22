import { afterEach, describe, expect, it } from 'vitest';
import {
  FORM_CONTROL_HIT_PX,
  FORM_LABEL_ROW_MIN_HEIGHT_PX,
} from './form-control-metrics';

/** Minimal rules under test (kept in sync with styles.scss). */
const FIXTURE_CSS = `
.budget-seg--tap .budget-seg__option {
  display: flex;
  align-items: center;
  min-height: ${FORM_LABEL_ROW_MIN_HEIGHT_PX}px;
  gap: 12px;
}
.budget-seg--tap .budget-seg__option input[type='radio'] {
  width: ${FORM_CONTROL_HIT_PX}px;
  height: ${FORM_CONTROL_HIT_PX}px;
  min-width: ${FORM_CONTROL_HIT_PX}px;
  min-height: ${FORM_CONTROL_HIT_PX}px;
  opacity: 1;
  margin: 0;
  flex-shrink: 0;
}
label.branch-check {
  display: flex;
  align-items: flex-start;
  min-height: ${FORM_LABEL_ROW_MIN_HEIGHT_PX}px;
  gap: 12px;
}
label.branch-check input[type='checkbox'] {
  width: ${FORM_CONTROL_HIT_PX}px;
  height: ${FORM_CONTROL_HIT_PX}px;
  min-width: ${FORM_CONTROL_HIT_PX}px;
  min-height: ${FORM_CONTROL_HIT_PX}px;
  margin: 0;
  flex-shrink: 0;
}
label.location-option.branch-check {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  min-height: ${FORM_LABEL_ROW_MIN_HEIGHT_PX}px;
}
`;

function px(value: string): number {
  return Number.parseFloat(value);
}

function mountFixture(html: string): void {
  document.head.querySelectorAll('[data-form-control-metrics]').forEach((el) => el.remove());
  const style = document.createElement('style');
  style.setAttribute('data-form-control-metrics', '1');
  style.textContent = FIXTURE_CSS;
  document.head.appendChild(style);
  document.body.innerHTML = html;
}

describe('form control metrics (DOM computed styles)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.head.querySelectorAll('[data-form-control-metrics]').forEach((el) => el.remove());
  });

  it('budget-seg tap radio is visible 24×24', () => {
    mountFixture(`
      <div class="budget-seg budget-seg--tap">
        <label class="budget-seg__option is-active">
          <input type="radio" name="budgetMode" checked />
          <span>เปิดรับข้อเสนอ</span>
        </label>
      </div>
    `);
    const radio = document.querySelector('input[type="radio"]') as HTMLInputElement;
    const styles = getComputedStyle(radio);
    expect(px(styles.width)).toBe(FORM_CONTROL_HIT_PX);
    expect(px(styles.height)).toBe(FORM_CONTROL_HIT_PX);
    expect(px(styles.opacity)).toBe(1);
  });

  it('branch-check checkbox is 24×24 with 44px label row', () => {
    mountFixture(`
      <label class="branch-check">
        <input type="checkbox" />
        <span>สาขาหลัก<br />บรรทัดที่สอง</span>
      </label>
    `);
    const label = document.querySelector('label.branch-check') as HTMLLabelElement;
    const box = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    const labelStyles = getComputedStyle(label);
    const boxStyles = getComputedStyle(box);
    expect(px(labelStyles.minHeight)).toBe(FORM_LABEL_ROW_MIN_HEIGHT_PX);
    expect(labelStyles.alignItems).toBe('flex-start');
    expect(px(boxStyles.width)).toBe(FORM_CONTROL_HIT_PX);
    expect(px(boxStyles.height)).toBe(FORM_CONTROL_HIT_PX);
  });

  it('centers branch-check control with 16px card inset', () => {
    mountFixture(`
      <label class="location-option branch-check">
        <input type="checkbox" />
        <span>
          <strong>จุด A</strong>
          <small>รัศมี 5 กม.</small>
        </span>
      </label>
    `);
    const label = document.querySelector('label.location-option.branch-check') as HTMLLabelElement;
    const box = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    const labelStyles = getComputedStyle(label);
    const boxStyles = getComputedStyle(box);
    expect(labelStyles.alignItems).toBe('center');
    expect(px(labelStyles.padding)).toBe(16);
    expect(px(labelStyles.gap)).toBe(12);
    expect(px(boxStyles.width)).toBe(FORM_CONTROL_HIT_PX);
    expect(px(boxStyles.marginLeft)).toBe(0);
  });
});
