import { Component, computed, input } from '@angular/core';
import { maxLengthMessage } from '../field-limits';

/** M-5: shared n/N counter + limit message (same look as bid detail counter). */
@Component({
  selector: 'app-char-counter',
  template: `
    <small class="muted" [class.error-text]="atLimit()" aria-live="polite">{{ length() }}/{{ max() }}</small>
    @if (atLimit()) {
      <small class="error-text" role="status" style="display: block">{{ message() }}</small>
    }
  `,
})
export class CharCounter {
  readonly value = input<string | null | undefined>('');
  readonly max = input.required<number>();
  readonly label = input('ข้อความ');
  protected readonly length = computed(() => (this.value() ?? '').length);
  protected readonly atLimit = computed(() => this.length() >= this.max());
  protected readonly message = computed(() => maxLengthMessage(this.label(), this.max()));
}
