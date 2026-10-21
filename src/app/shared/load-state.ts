import { signal } from '@angular/core';

/** Delay before showing the "slow connection" hint. */
export const SLOW_LOAD_HINT_MS = 4000;

/**
 * Tracks slow loading: after 4s of `begin()` without `end()`, `slow()` becomes true.
 * Use together with `<app-skeleton-card [slow]="hint.slow()" />`.
 */
export class SlowLoadHint {
  readonly slow = signal(false);
  private timer: ReturnType<typeof setTimeout> | null = null;

  begin(): void {
    this.end();
    this.timer = setTimeout(() => this.slow.set(true), SLOW_LOAD_HINT_MS);
  }

  end(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.slow.set(false);
  }
}

/** 404 (or 400 for malformed ids such as `bad-id`) means the resource does not exist. */
export function isNotFoundError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) {
    return false;
  }
  const status = (err as { status?: number }).status;
  return status === 404 || status === 400;
}
