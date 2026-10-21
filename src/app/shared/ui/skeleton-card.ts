import { Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-card',
  template: `
    @if (slow()) {
      <p class="muted" style="text-align: center" role="status">กำลังเชื่อมต่อเซิร์ฟเวอร์ อาจใช้เวลาสักครู่</p>
    }
    @for (i of items(); track i) {
      <div class="card" aria-hidden="true">
        <div class="skel" style="height: 20px; width: 60%"></div>
        <div class="skel" style="height: 14px; margin-top: 12px"></div>
        <div class="skel" style="height: 14px; width: 80%; margin-top: 8px"></div>
      </div>
    }
  `,
})
export class SkeletonCard {
  /** Show the "connecting to server" hint (set after ~4s of loading). */
  readonly slow = input(false);
  readonly count = input(2);

  protected items(): number[] {
    return Array.from({ length: this.count() }, (_, i) => i);
  }
}
