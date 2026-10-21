import { Component, OnDestroy, OnInit, input, signal } from '@angular/core';

@Component({
  selector: 'app-loading-skeleton',
  template: `
    @if (visible()) {
      <div class="skeleton-list" aria-busy="true" aria-label="กำลังโหลด">
        @for (row of rows(); track row) {
          <div class="skeleton-card"></div>
        }
      </div>
    }
  `,
})
export class LoadingSkeleton implements OnInit, OnDestroy {
  readonly count = input(3);
  protected readonly visible = signal(false);
  private timer = 0;

  ngOnInit(): void {
    this.timer = window.setTimeout(() => this.visible.set(true), 200);
  }

  ngOnDestroy(): void {
    window.clearTimeout(this.timer);
  }

  protected rows(): number[] {
    return Array.from({ length: Math.max(1, this.count()) }, (_, index) => index);
  }
}
