import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-confirm-sheet',
  template: `
    @if (open()) {
      <div class="scrim" (click)="cancel.emit()"></div>
      <div class="sheet" role="dialog" aria-modal="true" [attr.aria-label]="title()">
        <div class="grab"></div>
        <h3>{{ title() }}</h3>
        @if (message()) {
          <p class="muted" style="white-space: pre-line">{{ message() }}</p>
        }
        @if (reasonEnabled()) {
          <label class="field" style="margin-top: 12px">
            <span>{{ reasonLabel() }}</span>
            <textarea
              class="input"
              rows="3"
              [value]="reasonDraft()"
              [placeholder]="reasonPlaceholder()"
              (input)="reasonDraft.set($any($event.target).value)"
            ></textarea>
          </label>
        }
        <div class="btns">
          <button
            type="button"
            class="btn btn-block"
            [class.btn-danger]="danger()"
            [class.btn-primary]="!danger()"
            [disabled]="busy()"
            (click)="onConfirm()"
          >
            {{ busy() ? 'กำลังดำเนินการ…' : confirmLabel() }}
          </button>
          <button type="button" class="btn btn-ghost btn-block" [disabled]="busy()" (click)="cancel.emit()">
            {{ cancelLabel() }}
          </button>
        </div>
      </div>
    }
  `,
})
export class ConfirmSheet {
  readonly open = input(false);
  readonly title = input('ยืนยันการทำรายการ');
  readonly message = input('');
  readonly confirmLabel = input('ยืนยัน');
  readonly cancelLabel = input('ยกเลิก');
  readonly danger = input(false);
  readonly busy = input(false);
  /** Optional free-text reason (e.g. reject appointment). */
  readonly reasonEnabled = input(false);
  readonly reasonLabel = input('เหตุผล (ไม่บังคับ)');
  readonly reasonPlaceholder = input('ระบุเหตุผลสั้น ๆ');
  readonly confirm = output<void>();
  /** Emits trimmed reason when reasonEnabled; otherwise unused. */
  readonly confirmWithReason = output<string>();
  readonly cancel = output<void>();

  protected readonly reasonDraft = signal('');

  protected onConfirm(): void {
    if (this.reasonEnabled()) {
      this.confirmWithReason.emit(this.reasonDraft().trim());
    }
    this.confirm.emit();
  }

  /** Reset draft when parent closes/opens — call from parent if needed. */
  resetReason(): void {
    this.reasonDraft.set('');
  }
}
