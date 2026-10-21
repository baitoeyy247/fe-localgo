import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type RequesterFlowStep = 'post' | 'bids' | 'appointment' | 'review';

@Component({
  selector: 'app-requester-flow-bar',
  template: `
    <nav class="flow-bar" aria-label="ขั้นตอนงานของฉัน">
      @for (step of steps; track step.id) {
        @if (canOpen(step.id)) {
          <a
            class="flow-bar__step"
            [class.is-active]="active() === step.id"
            [class.is-done]="stepIndex(step.id) < stepIndex(active())"
            [attr.aria-current]="active() === step.id ? 'step' : null"
            [routerLink]="step.link"
          >
            <span>{{ step.n }}</span> {{ step.label }}
          </a>
        } @else {
          <span class="flow-bar__step is-locked" aria-disabled="true">
            <span>{{ step.n }}</span> {{ step.label }}
          </span>
        }
      }
    </nav>
  `,
  imports: [RouterLink],
})
export class RequesterFlowBar {
  readonly active = input.required<RequesterFlowStep>();
  readonly unlockedThrough = input<RequesterFlowStep | null>(null);

  protected readonly steps: Array<{ id: RequesterFlowStep; n: string; label: string; link: string }> = [
    { id: 'post', n: '1', label: 'ประกาศ', link: '/requester/post' },
    { id: 'bids', n: '2', label: 'ข้อเสนอ', link: '/requester/bids' },
    { id: 'appointment', n: '3', label: 'นัดหมาย', link: '/requester/appointment' },
    { id: 'review', n: '4', label: 'รีวิว', link: '/requester/review' },
  ];

  protected stepIndex(step: RequesterFlowStep): number {
    return this.steps.findIndex((item) => item.id === step);
  }

  protected maxUnlockedStep(): RequesterFlowStep {
    return this.unlockedThrough() ?? this.active();
  }

  protected canOpen(step: RequesterFlowStep): boolean {
    return this.stepIndex(step) <= this.stepIndex(this.maxUnlockedStep());
  }
}
