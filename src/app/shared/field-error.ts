import { Component, input } from '@angular/core';

@Component({
  selector: 'app-field-error',
  template: `
    @if (message()) {
      <p class="field-error" role="alert" aria-live="assertive" [id]="errorId()">{{ message() }}</p>
    }
  `,
})
export class FieldError {
  readonly message = input<string | null | undefined>(null);
  readonly errorId = input('field-error');
}
