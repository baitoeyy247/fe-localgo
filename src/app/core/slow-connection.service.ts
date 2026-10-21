import { Injectable, signal } from '@angular/core';

/** Shows a slow-connection hint while API calls are still in flight after 4 seconds. */
@Injectable({ providedIn: 'root' })
export class SlowConnectionService {
  private inflight = 0;
  readonly visible = signal(false);

  begin(): void {
    this.inflight += 1;
  }

  end(): void {
    this.inflight = Math.max(0, this.inflight - 1);
    if (this.inflight === 0) {
      this.visible.set(false);
    }
  }

  markSlow(): void {
    if (this.inflight > 0) {
      this.visible.set(true);
    }
  }
}
