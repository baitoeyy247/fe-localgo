import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly message = signal<string | null>(null);
  private clearTimer: ReturnType<typeof setTimeout> | null = null;

  show(text: string, ms = 2800): void {
    this.message.set(text);
    if (this.clearTimer) {
      clearTimeout(this.clearTimer);
    }
    this.clearTimer = setTimeout(() => {
      if (this.message() === text) {
        this.message.set(null);
      }
    }, ms);
  }

  clear(): void {
    this.message.set(null);
  }
}
