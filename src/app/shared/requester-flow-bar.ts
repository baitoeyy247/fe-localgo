import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type RequesterFlowStep = 'post' | 'bids' | 'appointment' | 'review';

@Component({
  selector: 'app-requester-flow-bar',
  template: `
    <nav class="flow" aria-label="ขั้นตอนงานของฉัน">
      <a
        [class.on]="active() === 'post' || stepIndex('post') < stepIndex(active())"
        [class.is-locked]="!canOpen('post')"
        [attr.aria-disabled]="!canOpen('post')"
        [attr.tabindex]="canOpen('post') ? 0 : -1"
        (click)="onStepClick($event, 'post')"
        routerLink="/requester/post"
      >
        <b>1</b>ประกาศ
      </a>
      <a
        [class.on]="active() === 'bids' || stepIndex('bids') < stepIndex(active())"
        [class.is-locked]="!canOpen('bids')"
        [attr.aria-disabled]="!canOpen('bids')"
        [attr.tabindex]="canOpen('bids') ? 0 : -1"
        (click)="onStepClick($event, 'bids')"
        routerLink="/requester/bids"
      >
        <b>2</b>ข้อเสนอ
      </a>
      <a
        [class.on]="active() === 'appointment' || stepIndex('appointment') < stepIndex(active())"
        [class.is-locked]="!canOpen('appointment')"
        [attr.aria-disabled]="!canOpen('appointment')"
        [attr.tabindex]="canOpen('appointment') ? 0 : -1"
        (click)="onStepClick($event, 'appointment')"
        routerLink="/requester/appointment"
      >
        <b>3</b>นัดหมาย
      </a>
      <a
        [class.on]="active() === 'review'"
        [class.is-locked]="!canOpen('review')"
        [attr.aria-disabled]="!canOpen('review')"
        [attr.tabindex]="canOpen('review') ? 0 : -1"
        (click)="onStepClick($event, 'review')"
        routerLink="/requester/review"
      >
        <b>4</b>รีวิว
      </a>
    </nav>
  `,
  imports: [RouterLink],
})
export class RequesterFlowBar {
  readonly active = input.required<RequesterFlowStep>();
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
