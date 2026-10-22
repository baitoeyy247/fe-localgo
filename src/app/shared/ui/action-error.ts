import { Component, input } from '@angular/core';

/**
 * R38 T4-25/A5-13: inline failure for a user action (cancel, review…).
 * Never reuses the page-load error state (no "ลองใหม่" reload button); announced via role=alert only,
 * so the success live region (toast) stays silent.
 */
@Component({
  selector: 'app-action-error',
  template: `
    <div class="banner warn action-error" role="alert" tabindex="-1">
      <span><b>{{ heading() }}</b>@if (message() && message() !== heading()) {<br />{{ message() }}}</span>
    </div>
  `,
})
export class ActionError {
  readonly heading = input.required<string>();
  readonly message = input<string | null>(null);
}
