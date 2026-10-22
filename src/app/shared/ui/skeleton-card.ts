import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-skeleton-card',
  template: `
    @if (timedOut()) {
      <div class="state" role="alert">
        <div class="em">⏳</div>
        <h3>โหลดนานเกินไป</h3>
        <p>เกิน 10 วินาทีแล้ว ลองใหม่อีกครั้ง</p>
        <button type="button" class="btn btn-primary" (click)="retry.emit()">ลองใหม่</button>
      </div>
    } @else {
      @if (slow()) {
        <p class="muted" style="text-align: center" role="status">กำลังเชื่อมต่อเซิร์ฟเวอร์…</p>
      }
      <div class="skeleton-stack" [class.skeleton-stack--detail]="variant() === 'detail'">
        @for (i of items(); track i) {
          <div class="card skeleton-card" aria-hidden="true">
            <div class="skel" [style.height.px]="variant() === 'detail' ? 24 : 20" style="width: 60%"></div>
            <div class="skel" style="height: 14px; margin-top: 12px"></div>
            <div class="skel" style="height: 14px; width: 80%; margin-top: 8px"></div>
            @if (variant() === 'detail') {
              <div class="skel" style="height: 120px; width: 100%; margin-top: 12px; border-radius: 12px"></div>
            }
          </div>
        }
      </div>
    }
  `,
})
export class SkeletonCard {
  /** Show the "connecting to server" hint (set after ~3s of loading). */
  readonly slow = input(false);
  /** After ~10s — show retry instead of skeleton. */
  readonly timedOut = input(false);
  readonly count = input(2);
  readonly variant = input<'list' | 'detail'>('list');
  readonly retry = output<void>();

  protected items(): number[] {
    return Array.from({ length: this.count() }, (_, i) => i);
  }
}
