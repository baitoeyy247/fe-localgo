import { signal } from '@angular/core';

/** Delay before showing the "connecting to server" hint. */
export const SLOW_LOAD_HINT_MS = 3000;
/** After this, show timeout + retry affordance. */
export const LOAD_TIMEOUT_MS = 10_000;

/**
 * Tracks slow loading: after 3s of `begin()` without `end()`, `slow()` becomes true.
 * After 10s, `timedOut()` becomes true for retry UI.
 * Use together with `<app-skeleton-card [slow]="hint.slow()" [timedOut]="hint.timedOut()" (retry)="..." />`.
 */
export class SlowLoadHint {
  readonly slow = signal(false);
  readonly timedOut = signal(false);
  private slowTimer: ReturnType<typeof setTimeout> | null = null;
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;

  begin(): void {
    this.end();
    this.slowTimer = setTimeout(() => this.slow.set(true), SLOW_LOAD_HINT_MS);
    this.timeoutTimer = setTimeout(() => this.timedOut.set(true), LOAD_TIMEOUT_MS);
  }

  end(): void {
    if (this.slowTimer) {
      clearTimeout(this.slowTimer);
      this.slowTimer = null;
    }
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    this.slow.set(false);
    this.timedOut.set(false);
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
