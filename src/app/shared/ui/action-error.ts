import { AfterViewInit, Component, ElementRef, inject, input } from '@angular/core';

/**
 * R38 T4-25/A5-13: inline failure for a user action (cancel, review…).
 * Never reuses the page-load error state (no "ลองใหม่" reload button); announced via role=alert only,
 * so the success live region (toast) stays silent.
 * R39 A5-15: takes focus when shown so keyboard/SR focus never drops to <body> after the sheet closes.
 */
@Component({
  selector: 'app-action-error',
  template: `
    <div class="banner warn action-error" role="alert" tabindex="-1">
      <span><b>{{ heading() }}</b>@if (message() && message() !== heading()) {<br />{{ message() }}}</span>
    </div>
  `,
})
export class ActionError implements AfterViewInit {
  readonly heading = input.required<string>();
  readonly message = input<string | null>(null);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  ngAfterViewInit(): void {
    setTimeout(() => {
      const box = this.host.nativeElement.querySelector<HTMLElement>('.action-error');
      box?.focus({ preventScroll: false });
    }, 0);
  }
}
