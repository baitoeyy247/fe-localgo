import { Component, effect, input, output, signal } from '@angular/core';
import { toDatetimeLocal } from '../datetime.util';

let nextThaiDatetimeFieldId = 0;

/**
 * Date/time inputs that do not depend on browser locale (DD/MM/YYYY + 24h HH:MM).
 */
@Component({
  selector: 'app-thai-datetime-field',
  template: `
    <div class="form-field thai-datetime field" [class.form-field--error]="showError()" [class.field--error]="showError()">
      @if (label()) {
        <span>{{ label() }}</span>
      }
      <div class="datetime-pair">
        <input
          class="input form-field__input"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          aria-label="วันที่ วว/ดด/ปปปป"
          placeholder="วว/ดด/ปปปป (พ.ศ.)"
          maxlength="10"
          [attr.aria-invalid]="showError() ? 'true' : null"
          [attr.aria-describedby]="showError() ? errorId + ' ' + hintId : hintId"
          [value]="dateText()"
          (input)="onDateInput($any($event.target).value)"
        />
        <input
          class="input form-field__input"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          aria-label="เวลา 24 ชั่วโมง"
          placeholder="HH:MM"
          maxlength="5"
          [attr.aria-invalid]="showError() ? 'true' : null"
          [attr.aria-describedby]="showError() ? errorId + ' ' + hintId : hintId"
          [value]="timeText()"
          (input)="onTimeInput($any($event.target).value)"
        />
      </div>
      <!-- A5-12: error sits directly under the inputs (before the helper) and is announced. -->
      @if (showError()) {
        <p class="error-text" [id]="errorId" role="alert" style="margin: 4px 0 0">{{ errorMessage() }}</p>
      }
      @if (displaySummary(); as summary) {
        <small class="form-field__hint muted" [id]="hintId">{{ summary }}</small>
      } @else {
        <small class="form-field__hint muted" [id]="hintId">วันที่ วว/ดด/ปปปป ใช้ปี พ.ศ. (เช่น 24/10/2569) หรือ ค.ศ. (2026) · เวลา 24 ชม.</small>
      }
    </div>
  `,
})
export class ThaiDatetimeField {
  readonly label = input('วันและเวลา');
  readonly value = input('');
  readonly requireFuture = input(false);
  readonly valueChange = output<string>();
  readonly validityChange = output<boolean>();
  /** L-15: raw typed text (date + time) so partial edits still count as dirty. */
  readonly rawChange = output<string>();

  protected readonly dateText = signal('');
  protected readonly timeText = signal('');
  protected readonly touched = signal(false);
  protected readonly errorId = `thai-dt-error-${++nextThaiDatetimeFieldId}`;
  protected readonly hintId = `thai-dt-hint-${nextThaiDatetimeFieldId}`;

  private syncingFromParent = false;

  constructor() {
    effect(() => {
      const external = this.value();
      if (this.syncingFromParent) {
        return;
      }
      if (!external) {
        this.dateText.set('');
        this.timeText.set('');
        return;
      }
      const parsed = this.parseIsoLocal(external);
      if (!parsed) {
        return;
      }
      this.dateText.set(parsed.date);
      this.timeText.set(parsed.time);
    });
  }

  protected displaySummary(): string | null {
    const iso = this.toIsoLocal();
    if (!iso) {
      return null;
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return null;
    }
    const date = d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `เลือก: ${date} ${time} น.`;
  }

  protected showError(): boolean {
    return this.touched() && !this.isValid();
  }

  /** L-16b: a complete DD/MM/YYYY that is not a real calendar date (31/02, 15/13, 29/02 non-leap). */
  public hasInvalidDate(): boolean {
    const text = this.dateText().trim();
    return /^\d{1,2}\/\d{1,2}\/\d{4}$/u.test(text) && !this.parseDateParts(text);
  }

  public errorMessage(): string {
    // A5-12/L-16b: invalid date wins over "missing time" and "future" messages.
    if (this.hasInvalidDate()) {
      return 'วันที่ไม่ถูกต้อง';
    }
    if (!this.dateText().trim() || !this.timeText().trim()) {
      return 'กรุณาเลือกวันที่และเวลา';
    }
    const iso = this.toIsoLocal();
    if (this.requireFuture()) {
      if (iso && !this.isFuture()) {
        return 'กรุณาเลือกวันและเวลาในอนาคต';
      }
      if (!iso) {
        const parts = this.parseDateParts(this.dateText());
        const time = this.parseTimeParts(this.timeText());
        if (parts && time) {
          return 'กรุณาเลือกวันและเวลาในอนาคต';
        }
      }
    }
    if (!iso) {
      return 'รูปแบบวันที่หรือเวลาไม่ถูกต้อง';
    }
    return 'วันและเวลาไม่ถูกต้อง';
  }

  protected onDateInput(raw: string): void {
    this.dateText.set(this.formatDateTyping(raw));
    this.commit();
  }

  protected onTimeInput(raw: string): void {
    this.timeText.set(this.formatTimeTyping(raw));
    this.commit();
  }

  public markTouched(): void {
    this.touched.set(true);
    this.validityChange.emit(this.isValid());
  }

  public isValid(): boolean {
    if (!this.toIsoLocal()) {
      return false;
    }
    if (this.requireFuture() && !this.isFuture()) {
      return false;
    }
    return true;
  }

  private commit(): void {
    this.touched.set(true);
    const iso = this.toIsoLocal();
    this.syncingFromParent = true;
    this.valueChange.emit(iso);
    this.rawChange.emit(`${this.dateText().trim()} ${this.timeText().trim()}`.trim());
    this.syncingFromParent = false;
    this.validityChange.emit(this.isValid());
  }

  private isFuture(): boolean {
    const iso = this.toIsoLocal();
    if (!iso) {
      return false;
    }
    const d = new Date(iso);
    return !Number.isNaN(d.getTime()) && d.getTime() > Date.now() - 60_000;
  }

  private toIsoLocal(): string {
    const parts = this.parseDateParts(this.dateText());
    const time = this.parseTimeParts(this.timeText());
    if (!parts || !time) {
      return '';
    }
    return toDatetimeLocal(new Date(parts.y, parts.m - 1, parts.d, time.hh, time.mm, 0, 0));
  }

  private parseDateParts(text: string): { d: number; m: number; y: number } | null {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u.exec(text.trim());
    if (!m) {
      return null;
    }
    const d = Number(m[1]);
    const mo = Number(m[2]);
    let y = Number(m[3]);
    if (d < 1 || d > 31 || mo < 1 || mo > 12) {
      return null;
    }
    if (y >= 2400) {
      y -= 543;
    }
    if (y < 2000 || y > 2100) {
      return null;
    }
    // L-16: strict calendar check — 31/02, 30/02, 29/02 (non-leap) must not roll over to March
    if (d > new Date(y, mo, 0).getDate()) {
      return null;
    }
    return { d, m: mo, y };
  }

  private parseTimeParts(text: string): { hh: number; mm: number } | null {
    const m = /^(\d{1,2}):(\d{2})$/u.exec(text.trim());
    if (!m) {
      return null;
    }
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
      return null;
    }
    return { hh, mm };
  }

  private formatDateTyping(raw: string): string {
    const digits = raw.replace(/\D/gu, '').slice(0, 8);
    if (digits.length <= 2) {
      return digits;
    }
    if (digits.length <= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }

  private formatTimeTyping(raw: string): string {
    const cleaned = raw.replace(/[^\d:]/gu, '');
    if (cleaned.includes(':')) {
      const [h, m = ''] = cleaned.split(':');
      return `${h.slice(0, 2)}:${m.replace(/\D/gu, '').slice(0, 2)}`;
    }
    const digits = cleaned.replace(/\D/gu, '').slice(0, 4);
    if (digits.length <= 2) {
      return digits;
    }
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  }

  private parseIsoLocal(value: string): { date: string; time: string } | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/u.exec(value);
    if (!m) {
      return null;
    }
    const y = Number(m[1]);
    const be = y + 543;
    return {
      date: `${m[3]}/${m[2]}/${be}`,
      time: `${m[4]}:${m[5]}`,
    };
  }
}
