import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type RequesterFlowStep = 'post' | 'bids' | 'appointment' | 'review';

@Component({
  selector: 'app-requester-flow-bar',
  template: `
    <nav class="flow-bar" aria-label="ขั้นตอนงานของฉัน">
      <a
        class="flow-bar__step"
        [class.is-active]="active() === 'post'"
        [class.is-done]="stepIndex('post') < stepIndex(active())"
        [class.is-locked]="!canOpen('post')"
        [attr.aria-disabled]="!canOpen('post')"
        [attr.tabindex]="canOpen('post') ? 0 : -1"
        (click)="onStepClick($event, 'post')"
        routerLink="/requester/post"
      >
        <span>1</span> ประกาศ
      </a>
      <a
        class="flow-bar__step"
        [class.is-active]="active() === 'bids'"
        [class.is-done]="stepIndex('bids') < stepIndex(active())"
        [class.is-locked]="!canOpen('bids')"
        [attr.aria-disabled]="!canOpen('bids')"
        [attr.tabindex]="canOpen('bids') ? 0 : -1"
        (click)="onStepClick($event, 'bids')"
        routerLink="/requester/bids"
      >
        <span>2</span> ข้อเสนอ
      </a>
      <a
        class="flow-bar__step"
        [class.is-active]="active() === 'appointment'"
        [class.is-done]="stepIndex('appointment') < stepIndex(active())"
        [class.is-locked]="!canOpen('appointment')"
        [attr.aria-disabled]="!canOpen('appointment')"
        [attr.tabindex]="canOpen('appointment') ? 0 : -1"
        (click)="onStepClick($event, 'appointment')"
        routerLink="/requester/appointment"
      >
        <span>3</span> นัดหมาย
      </a>
      <a
        class="flow-bar__step"
        [class.is-active]="active() === 'review'"
        [class.is-done]="stepIndex('review') < stepIndex(active())"
        [class.is-locked]="!canOpen('review')"
        [attr.aria-disabled]="!canOpen('review')"
        [attr.tabindex]="canOpen('review') ? 0 : -1"
        (click)="onStepClick($event, 'review')"
        routerLink="/requester/review"
      >
        <span>4</span> รีวิว
      </a>
    </nav>
  `,
  imports: [RouterLink],
})
export class RequesterFlowBar {
  readonly active = input.required<RequesterFlowStep>();
  /** ขั้นสูงสุดที่เปิดได้ (เช่น ปลดรีวิวหลังนัดหมายแล้ว แม้ยังอยู่หน้านัดหมาย) */
  readonly unlockedThrough = input<RequesterFlowStep | null>(null);

  protected stepIndex(step: RequesterFlowStep): number {
    const order: RequesterFlowStep[] = ['post', 'bids', 'appointment', 'review'];
    return order.indexOf(step);
  }

  protected maxUnlockedStep(): RequesterFlowStep {
    return this.unlockedThrough() ?? this.active();
  }

  protected canOpen(step: RequesterFlowStep): boolean {
    return this.stepIndex(step) <= this.stepIndex(this.maxUnlockedStep());
  }

  protected onStepClick(event: Event, step: RequesterFlowStep): void {
    if (!this.canOpen(step)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
