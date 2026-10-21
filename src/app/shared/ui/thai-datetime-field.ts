import { Component, effect, input, output, signal } from '@angular/core';
import { toDatetimeLocal } from '../datetime.util';

/**
 * Single date + time inputs (replaces 5 floating selects).
 * Starts empty unless parent provides a value — no silent default mismatch.
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
          type="date"
          aria-label="วันที่"
          [value]="datePart()"
          [min]="minDate()"
          (change)="onDateChange($any($event.target).value)"
        />
        <input
          class="input form-field__input"
          type="time"
          aria-label="เวลา"
          [value]="timePart()"
          (change)="onTimeChange($any($event.target).value)"
        />
      </div>
      <small class="form-field__hint muted">เลือกวันที่และเวลา (24 ชั่วโมง)</small>
      @if (showError()) {
        <p class="error-text">{{ errorMessage() }}</p>
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

  protected readonly datePart = signal('');
  protected readonly timePart = signal('');
  protected readonly touched = signal(false);

  private syncingFromParent = false;

  constructor() {
    effect(() => {
      const external = this.value();
      if (this.syncingFromParent) {
        return;
      }
      if (!external) {
        this.datePart.set('');
        this.timePart.set('');
        return;
      }
      const parsed = this.parseIsoLocal(external);
      if (!parsed) {
        return;
      }
      this.datePart.set(parsed.date);
      this.timePart.set(parsed.time);
    });
  }

  protected minDate(): string {
    if (!this.requireFuture()) {
      return '';
    }
    return toDatetimeLocal(new Date()).slice(0, 10);
  }

  protected showError(): boolean {
    return this.touched() && !this.isValid();
  }

  public errorMessage(): string {
    if (!this.datePart() || !this.timePart()) {
      return 'กรุณาเลือกวันที่และเวลา';
    }
    if (this.requireFuture() && !this.isFuture()) {
      return 'กรุณาเลือกวันและเวลาในอนาคต';
    }
    return 'วันและเวลาไม่ถูกต้อง';
  }

  protected onDateChange(raw: string): void {
    this.datePart.set(raw);
    this.commit();
  }

  protected onTimeChange(raw: string): void {
    this.timePart.set(raw);
    this.commit();
  }

  /** Call from parent before submit to show validation state. */
  public markTouched(): void {
    this.touched.set(true);
    this.validityChange.emit(this.isValid());
  }

  public isValid(): boolean {
    if (!this.datePart() || !this.timePart() || !this.toDate()) {
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
    this.syncingFromParent = false;
    this.validityChange.emit(this.isValid());
  }

  private toDate(): Date | null {
    const iso = this.toIsoLocal();
    if (!iso) {
      return null;
    }
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private isFuture(): boolean {
    const d = this.toDate();
    return !!d && d.getTime() > Date.now() - 60_000;
  }

  private toIsoLocal(): string {
    const date = this.datePart();
    const time = this.timePart();
    if (!date || !time) {
      return '';
    }
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) {
      return '';
    }
    return toDatetimeLocal(new Date(y, m - 1, d, hh, mm, 0, 0));
  }

  private parseIsoLocal(value: string): { date: string; time: string } | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/u.exec(value);
    if (!m) {
      return null;
    }
    return {
      date: `${m[1]}-${m[2]}-${m[3]}`,
      time: `${m[4]}:${m[5]}`,
    };
  }
}
