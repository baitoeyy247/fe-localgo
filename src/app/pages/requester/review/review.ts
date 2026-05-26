import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { RequesterBottomNav } from '../../../shared/requester-bottom-nav';
import { RequesterFlowBar, RequesterFlowStep } from '../../../shared/requester-flow-bar';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { SessionStateService } from '../../../core/session-state.service';
import { apiErrorMessage } from '../../../core/api-error.util';

@Component({
  selector: 'app-review-page',
  imports: [PageShell, RequesterBottomNav, RequesterFlowBar],
  templateUrl: './review.html',
})
export class ReviewPage implements OnInit {
  protected readonly rating = signal(5);
  protected readonly comment = signal('');
  protected readonly providerName = signal('ผู้ให้บริการ');
  protected readonly submitting = signal(false);
  protected readonly canSubmit = signal(false);
  protected readonly statusHint = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  private readonly api = inject(LocalGoApiService);
  private readonly session = inject(SessionStateService);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    const requestId = this.session.requesterRequestId;
    const providerId = this.session.currentProviderId;
    if (requestId) {
      try {
        const detail = await firstValueFrom(this.api.getRequest(requestId));
        const ready = detail.status === 'Completed';
        this.canSubmit.set(ready);
        if (!ready) {
          this.statusHint.set('รอให้งานเสร็จก่อนรีวิว');
        }
        if (!providerId && detail.selectedProviderId) {
          this.session.currentProviderId = detail.selectedProviderId;
        }
      } catch {
        this.statusHint.set('โหลดสถานะงานไม่สำเร็จ — ลองกลับมาอีกครั้ง');
      }
    } else {
      this.statusHint.set('ไม่พบงานที่จะรีวิว');
    }

    const resolvedProviderId = this.session.currentProviderId;
    if (resolvedProviderId) {
      try {
        const p = await firstValueFrom(this.api.getProvider(resolvedProviderId));
        this.providerName.set(p.name);
      } catch {
        /* keep default */
      }
    }
  }

  protected flowUnlockedThrough(): RequesterFlowStep {
    return this.canSubmit() ? 'review' : 'appointment';
  }

  protected setRating(value: number): void {
    this.rating.set(value);
  }

  protected async submit(): Promise<void> {
    const providerId = this.session.currentProviderId;
    const requestId = this.session.requesterRequestId;
    if (!providerId || this.submitting()) {
      await this.router.navigateByUrl('/requester');
      return;
    }
    if (!this.canSubmit()) {
      this.error.set('ยังส่งรีวิวไม่ได้ — รอให้งานเสร็จสิ้นก่อน');
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.createReview(providerId, {
          serviceRequestId: requestId ?? undefined,
          reviewType: 'Verified',
          rating: this.rating(),
          comment: this.comment().trim() || undefined,
        }),
      );
      this.session.clearRequesterFlow();
      await this.router.navigateByUrl('/requester');
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'ส่งรีวิวไม่สำเร็จ'));
    } finally {
      this.submitting.set(false);
    }
  }
}
