import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-sheet',
  template: `
    @if (open()) {
      <div class="scrim" (click)="cancel.emit()"></div>
      <div class="sheet" role="dialog" aria-modal="true" [attr.aria-label]="title()">
        <div class="grab"></div>
        <h3>{{ title() }}</h3>
        @if (message()) {
          <p class="muted">{{ message() }}</p>
        }
        <div class="btns">
          <button
            type="button"
            class="btn btn-block"
            [class.btn-danger]="danger()"
            [class.btn-primary]="!danger()"
            [disabled]="busy()"
            (click)="confirm.emit()"
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
  readonly confirm = output<void>();
  readonly cancel = output<void>();
}
