import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type RequesterFlowStep = 'post' | 'bids' | 'appointment' | 'review';

@Component({
  selector: 'app-requester-flow-bar',
  template: `
    <nav
      class="flow"
      [class.flow--direct]="mode() === 'direct'"
      aria-label="ขั้นตอนงานของฉัน"
    >
      @if (mode() === 'standard') {
        <a
          class="flow__link"
          [class.on]="active() === 'post'"
          [class.is-step]="true"
          [class.is-locked]="!canOpen('post')"
          [attr.aria-current]="active() === 'post' ? 'step' : null"
          [attr.tabindex]="canOpen('post') ? 0 : -1"
          (click)="onStepClick($event, 'post')"
          routerLink="/requester/post"
        >
          <b>1</b>ประกาศ
        </a>
        <a
          class="flow__link"
          [class.on]="active() === 'bids'"
          [class.is-step]="true"
          [class.is-locked]="!canOpen('bids')"
          [attr.aria-current]="active() === 'bids' ? 'step' : null"
          [attr.tabindex]="canOpen('bids') ? 0 : -1"
          (click)="onStepClick($event, 'bids')"
          routerLink="/requester/bids"
          [queryParams]="stepQuery()"
        >
          <b>2</b>ข้อเสนอ
        </a>
        <a
          class="flow__link"
          [class.on]="active() === 'appointment'"
          [class.is-step]="true"
          [class.is-locked]="!canOpen('appointment')"
          [attr.aria-current]="active() === 'appointment' ? 'step' : null"
          [attr.tabindex]="canOpen('appointment') ? 0 : -1"
          (click)="onStepClick($event, 'appointment')"
          routerLink="/requester/appointment"
          [queryParams]="stepQuery()"
        >
          <b>3</b>นัดหมาย
        </a>
        <a
          class="flow__link"
          [class.on]="active() === 'review'"
          [class.is-step]="true"
          [class.is-locked]="!canOpen('review')"
          [attr.aria-current]="active() === 'review' ? 'step' : null"
          [attr.tabindex]="canOpen('review') ? 0 : -1"
          (click)="onStepClick($event, 'review')"
          routerLink="/requester/review"
          [queryParams]="stepQuery()"
        >
          <b>4</b>รีวิว
        </a>
      } @else {
        <span class="flow__link on" aria-current="step"><b>1</b>นัดหมาย</span>
        <a
          class="flow__link"
          [class.on]="active() === 'review'"
          [class.is-locked]="!canOpen('review')"
          routerLink="/requester/review"
          [queryParams]="stepQuery()"
        >
          <b>2</b>รีวิว
        </a>
      }
    </nav>
    @if (mode() === 'standard') {
      <p class="muted flow-hint" style="margin: 4px 0 0; font-size: 13px">
        ขั้นที่ปิดอยู่จะเปิดเมื่อถึงลำดับนั้น
      </p>
    }
  `,
  imports: [RouterLink],
})
export class RequesterFlowBar {
  readonly active = input.required<RequesterFlowStep>();
  readonly unlockedThrough = input<RequesterFlowStep | null>(null);
  readonly mode = input<'standard' | 'direct'>('standard');
  /** T4-26: keep the step links on the same request (e.g. open this request's appointment). */
  readonly requestId = input<string | null | undefined>(null);

  protected stepQuery(): Record<string, string> | null {
    const id = this.requestId();
    return id ? { requestId: id } : null;
  }

  protected stepIndex(step: RequesterFlowStep): number {
    const order: RequesterFlowStep[] = ['post', 'bids', 'appointment', 'review'];
    return order.indexOf(step);
  }

  protected maxUnlockedStep(): RequesterFlowStep {
    return this.unlockedThrough() ?? this.active();
  }

  protected canOpen(step: RequesterFlowStep): boolean {
    if (this.mode() === 'direct') {
      return step === 'appointment' || step === 'review';
    }
    return this.stepIndex(step) <= this.stepIndex(this.maxUnlockedStep());
  }

  protected onStepClick(event: Event, step: RequesterFlowStep): void {
    if (!this.canOpen(step)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
