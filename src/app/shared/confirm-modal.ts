import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  template: `
    @if (open()) {
      <div class="confirm-modal" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId">
        <div class="confirm-modal__sheet">
          <h2 [id]="titleId">{{ title() }}</h2>
          <p>{{ message() }}</p>
          <div class="confirm-modal__actions">
            <button type="button" (click)="cancel.emit()" [disabled]="busy()">{{ cancelLabel() }}</button>
            <button type="button" class="confirm-modal__confirm" (click)="confirm.emit()" [disabled]="busy()">
              {{ busy() ? busyLabel() : confirmLabel() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
  styles: `
    .confirm-modal {
      position: fixed;
      inset: 0;
      z-index: 40;
      display: grid;
      align-items: end;
      justify-items: center;
      padding: 1rem;
      background: rgba(16, 24, 31, 0.45);
    }
    .confirm-modal__sheet {
      width: min(100%, 28rem);
      display: grid;
      gap: 0.75rem;
      padding: 1.1rem;
      border-radius: 1rem;
      background: #fff;
    }
    .confirm-modal__sheet h2,
    .confirm-modal__sheet p {
      margin: 0;
      color: #10181f;
    }
    .confirm-modal__actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }
    .confirm-modal__actions button {
      min-height: 2.75rem;
      border-radius: 0.9rem;
      font-weight: 800;
    }
    .confirm-modal__confirm {
      border: 0;
      background: #9a3412;
      color: #fff;
    }
  `,
})
export class ConfirmModal {
  readonly open = input(false);
  readonly title = input('');
  readonly message = input('');
  readonly confirmLabel = input('ยืนยัน');
  readonly cancelLabel = input('กลับ');
  readonly busy = input(false);
  readonly busyLabel = input('กำลังบันทึก…');
  readonly confirm = output<void>();
  readonly cancel = output<void>();

  protected readonly titleId = `confirm-title-${Math.random().toString(36).slice(2, 8)}`;

  protected onEscape(): void {
    if (this.open() && !this.busy()) {
      this.cancel.emit();
    }
  }
}
