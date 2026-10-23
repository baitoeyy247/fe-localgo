import {
  Component,
  ElementRef,
  OnDestroy,
  afterRenderEffect,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

@Component({
  selector: 'app-confirm-sheet',
  template: `
    @if (open()) {
      <div class="scrim" (click)="cancel.emit()"></div>
      <div
        #sheet
        class="sheet"
        [attr.role]="danger() ? 'alertdialog' : 'dialog'"
        aria-modal="true"
        [attr.aria-label]="title()"
        tabindex="-1"
        (keydown)="onKeydown($event)"
      >
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
              [attr.maxlength]="reasonMaxLength()"
              (input)="reasonDraft.set($any($event.target).value)"
            ></textarea>
            <span class="muted field-counter" style="display: block; text-align: right; font-size: 12px">
              {{ reasonDraft().length }}/{{ reasonMaxLength() }}
            </span>
            @if (reasonDraft().length >= reasonMaxLength()) {
              <span class="error-text" role="alert">{{ reasonFieldName() }}ต้องไม่เกิน {{ reasonMaxLength() }} ตัวอักษร</span>
            }
          </label>
        }
        <div class="btns">
          <button
            type="button"
            class="btn btn-block"
            [class.btn-danger]="danger()"
            [class.btn-primary]="!danger()"
            [disabled]="busy()"
            [attr.aria-busy]="busy() ? 'true' : null"
            (click)="onConfirm()"
          >
            {{ busy() ? busyLabel() : confirmLabel() }}
          </button>
          @if (busy()) {
            <span class="sr-only" role="status">{{ busyLabel() }}</span>
          }
          <button
            type="button"
            class="btn btn-ghost btn-block"
            data-confirm-safe
            [disabled]="busy()"
            (click)="cancel.emit()"
          >
            {{ cancelLabel() }}
          </button>
        </div>
      </div>
    }
  `,
})
export class ConfirmSheet implements OnDestroy {
  readonly open = input(false);
  readonly title = input('ยืนยันการทำรายการ');
  readonly message = input('');
  readonly confirmLabel = input('ยืนยัน');
  readonly cancelLabel = input('ยกเลิก');
  readonly danger = input(false);
  readonly busy = input(false);
  readonly busyLabel = input('กำลังดำเนินการ…');
  /** Optional free-text reason (e.g. reject appointment). */
  readonly reasonEnabled = input(false);
  readonly reasonLabel = input('เหตุผล (ไม่บังคับ)');
  readonly reasonPlaceholder = input('ระบุเหตุผลสั้น ๆ');
  readonly reasonMaxLength = input(500);
  readonly reasonFieldName = input('เหตุผล');
  readonly confirm = output<void>();
  /** Emits trimmed reason when reasonEnabled; otherwise unused. */
  readonly confirmWithReason = output<string>();
  readonly cancel = output<void>();

  protected readonly reasonDraft = signal('');

  // A5-9: focus trap, Esc = cancel, restore focus, inert background.
  private readonly sheetRef = viewChild<ElementRef<HTMLElement>>('sheet');
  private returnFocusTo: HTMLElement | null = null;
  private inerted: HTMLElement[] = [];
  private active = false;

  constructor() {
    afterRenderEffect(() => {
      const isOpen = this.open();
      const sheet = this.sheetRef()?.nativeElement;
      untracked(() => {
        if (isOpen && sheet && !this.active) {
          this.activate(sheet);
        } else if (!isOpen && this.active) {
          this.deactivate();
        }
      });
    });
  }

  ngOnDestroy(): void {
    if (this.active) {
      this.deactivate();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (!this.busy()) {
        this.cancel.emit();
      }
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const sheet = this.sheetRef()?.nativeElement;
    if (!sheet) {
      return;
    }
    const items = this.focusables(sheet);
    if (items.length === 0) {
      event.preventDefault();
      sheet.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const current = document.activeElement as HTMLElement | null;
    if (event.shiftKey && (current === first || !sheet.contains(current))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (current === last || !sheet.contains(current))) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusables(root: HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.hasAttribute('inert'));
  }

  private activate(sheet: HTMLElement): void {
    this.active = true;
    const prev = document.activeElement;
    this.returnFocusTo = prev instanceof HTMLElement && prev !== document.body ? prev : null;
    this.inertBackground(sheet);
    // A5-10: destructive sheets open on the safe (cancel) button (WAI-ARIA APG alertdialog).
    const safe = this.danger() ? sheet.querySelector<HTMLElement>('[data-confirm-safe]:not([disabled])') : null;
    const target = safe ?? this.focusables(sheet)[0] ?? sheet;
    target.focus();
  }

  private deactivate(): void {
    this.active = false;
    for (const el of this.inerted) {
      el.removeAttribute('inert');
    }
    this.inerted = [];
    const back = this.returnFocusTo;
    this.returnFocusTo = null;
    if (back && back.isConnected) {
      back.focus();
    }
  }

  /** Mark every sibling along the sheet → body path inert (page content, bottom nav), except the scrim. */
  private inertBackground(sheet: HTMLElement): void {
    let node: HTMLElement | null = sheet;
    while (node && node !== document.body && node.parentElement) {
      const parent: HTMLElement = node.parentElement;
      for (const sib of Array.from(parent.children)) {
        if (sib === node || !(sib instanceof HTMLElement) || sib.classList.contains('scrim')) {
          continue;
        }
        if (sib.tagName === 'SCRIPT' || sib.hasAttribute('inert')) {
          continue;
        }
        sib.setAttribute('inert', '');
        this.inerted.push(sib);
      }
      node = parent;
    }
  }

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
