import { Component, effect, input, output, signal } from '@angular/core';
import { toDatetimeLocal } from '../datetime.util';

@Component({
  selector: 'app-thai-datetime-field',
  template: `
    <div class="form-field thai-datetime" [class.form-field--error]="showError()">
      @if (label()) {
        <span>{{ label() }}</span>
      }
      <div class="thai-datetime__row">
        <select
          class="form-field__input thai-datetime__part"
          aria-label="วัน"
          [value]="day()"
          (change)="onDayChange($any($event.target).value)"
        >
          @for (d of dayOptions(); track d) {
            <option [value]="d">{{ d }}</option>
          }
        </select>
        <select
          class="form-field__input thai-datetime__part"
          aria-label="เดือน"
          [value]="month()"
          (change)="onMonthChange($any($event.target).value)"
        >
          @for (m of monthOptions; track m.value) {
            <option [value]="m.value">{{ m.label }}</option>
          }
        </select>
        <select
          class="form-field__input thai-datetime__part thai-datetime__part--year"
          aria-label="ปี"
          [value]="year()"
          (change)="onYearChange($any($event.target).value)"
        >
          @for (y of yearOptions(); track y) {
            <option [value]="y">{{ y }}</option>
          }
        </select>
      </div>
      <div class="thai-datetime__row">
        <select
          class="form-field__input thai-datetime__part"
          aria-label="ชั่วโมง"
          [value]="hour()"
          (change)="onHourChange($any($event.target).value)"
        >
          @for (h of hourOptions; track h) {
            <option [value]="h">{{ h }}</option>
          }
        </select>
        <span class="thai-datetime__sep" aria-hidden="true">:</span>
        <select
          class="form-field__input thai-datetime__part"
          aria-label="นาที"
          [value]="minute()"
          (change)="onMinuteChange($any($event.target).value)"
        >
          @for (m of minuteOptions; track m) {
            <option [value]="m">{{ m }}</option>
          }
        </select>
      </div>
      <small class="form-field__hint">รูปแบบ วัน/เดือน/ปี และเวลา 24 ชั่วโมง</small>
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

  protected readonly day = signal('01');
  protected readonly month = signal('01');
  protected readonly year = signal(new Date().getFullYear());
  protected readonly hour = signal('09');
  protected readonly minute = signal('00');
  protected readonly touched = signal(false);

  protected readonly monthOptions = [
    { value: '01', label: 'ม.ค.' },
    { value: '02', label: 'ก.พ.' },
    { value: '03', label: 'มี.ค.' },
    { value: '04', label: 'เม.ย.' },
    { value: '05', label: 'พ.ค.' },
    { value: '06', label: 'มิ.ย.' },
    { value: '07', label: 'ก.ค.' },
    { value: '08', label: 'ส.ค.' },
    { value: '09', label: 'ก.ย.' },
    { value: '10', label: 'ต.ค.' },
    { value: '11', label: 'พ.ย.' },
    { value: '12', label: 'ธ.ค.' },
  ];

  protected readonly hourOptions = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, '0'),
  );
  protected readonly minuteOptions = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, '0'),
  );

  private syncingFromParent = false;

  constructor() {
    effect(() => {
      const external = this.value();
      if (!external || this.syncingFromParent) {
        return;
      }
      const parsed = this.parseIsoLocal(external);
      if (!parsed) {
        return;
      }
      this.day.set(parsed.day);
      this.month.set(parsed.month);
      this.year.set(parsed.year);
      this.hour.set(parsed.hour);
      this.minute.set(parsed.minute);
    });
  }

  protected dayOptions(): string[] {
    const count = this.daysInMonth(this.year(), this.month());
    return Array.from({ length: count }, (_, i) => (i + 1).toString().padStart(2, '0'));
  }

  protected yearOptions(): number[] {
    const now = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => now + i);
  }

  protected showError(): boolean {
    return this.touched() && !this.isValid();
  }

  protected errorMessage(): string {
    if (this.requireFuture() && !this.isFuture()) {
      return 'กรุณาเลือกวันและเวลาในอนาคต';
    }
    return 'วันและเวลาไม่ถูกต้อง';
  }

  protected onDayChange(raw: string): void {
    this.day.set(raw);
    this.commit();
  }

  protected onMonthChange(raw: string): void {
    this.month.set(raw);
    this.clampDay();
    this.commit();
  }

  protected onYearChange(raw: string): void {
    this.year.set(+raw);
    this.clampDay();
    this.commit();
  }

  protected onHourChange(raw: string): void {
    this.hour.set(raw);
    this.commit();
  }

  protected onMinuteChange(raw: string): void {
    this.minute.set(raw);
    this.commit();
  }

  /** Call from parent before submit to show validation state. */
  public markTouched(): void {
    this.touched.set(true);
    this.validityChange.emit(this.isValid());
  }

  public isValid(): boolean {
    if (!this.toDate()) {
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

  private clampDay(): void {
    const max = this.daysInMonth(this.year(), this.month());
    if (+this.day() > max) {
      this.day.set(max.toString().padStart(2, '0'));
    }
  }

  private daysInMonth(year: number, month: string): number {
    return new Date(year, +month, 0).getDate();
  }

  private toDate(): Date | null {
    const iso = this.toIsoLocal();
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private isFuture(): boolean {
    const d = this.toDate();
    return !!d && d.getTime() > Date.now();
  }

  private toIsoLocal(): string {
    return toDatetimeLocal(
      new Date(this.year(), +this.month() - 1, +this.day(), +this.hour(), +this.minute(), 0, 0),
    );
  }

  private parseIsoLocal(value: string): {
    day: string;
    month: string;
    year: number;
    hour: string;
    minute: string;
  } | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/u.exec(value);
    if (!m) {
      return null;
    }
    return {
      year: +m[1],
      month: m[2],
      day: m[3],
      hour: m[4],
      minute: m[5],
    };
  }
}
