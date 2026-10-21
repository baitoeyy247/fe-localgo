import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-toast-host',
  template: `
    @if (toast.message(); as msg) {
      <div class="toast-banner" role="status" aria-live="polite">{{ msg }}</div>
    }
  `,
  styles: `
    .toast-banner {
      position: fixed;
      left: 50%;
      bottom: calc(var(--nav-h, 64px) + 16px + var(--safe-b, 0px));
      transform: translateX(-50%);
      z-index: 80;
      max-width: min(420px, 92vw);
      padding: 12px 16px;
      border-radius: 12px;
      background: #1a1a1a;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
      pointer-events: none;
    }
    @media (min-width: 1024px) {
      .toast-banner {
        bottom: 24px;
      }
    }
  `,
})
export class ToastHost {
  protected readonly toast = inject(ToastService);
}
