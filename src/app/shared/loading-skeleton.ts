import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-skeleton',
  template: `
    <div class="skeleton-list" aria-busy="true" aria-label="กำลังโหลด">
      @for (row of rows(); track row) {
        <div class="skeleton-card"></div>
      }
    </div>
  `,
})
export class LoadingSkeleton {
  readonly count = input(3);

  protected rows(): number[] {
    return Array.from({ length: Math.max(1, this.count()) }, (_, index) => index);
  }
}
