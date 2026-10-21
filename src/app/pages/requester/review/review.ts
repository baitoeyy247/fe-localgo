import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { RequesterBottomNav } from '../../../shared/requester-bottom-nav';
import { RequesterFlowBar, RequesterFlowStep } from '../../../shared/requester-flow-bar';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { SessionStateService } from '../../../core/session-state.service';
import { apiErrorMessage } from '../../../core/api-error.util';
import { REVIEW_COMMENT_MAX } from '../../../shared/form-rules';
import { HttpErrorResponse } from '@angular/common/http';
import { ReviewItem } from '../../../core/models';

@Component({
  selector: 'app-review-page',
  imports: [PageShell, RequesterBottomNav, RequesterFlowBar, RouterLink],
  templateUrl: './review.html',
})
export class ReviewPage implements OnInit {
  protected readonly rating = signal<number | null>(null);
  protected readonly comment = signal('');
  protected readonly providerName = signal('ผู้ให้บริการ');
  protected readonly submitting = signal(false);
  protected readonly canSubmit = signal(false);
  protected readonly statusHint = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly savedReview = signal<ReviewItem | null>(null);
  protected readonly commentMax = REVIEW_COMMENT_MAX;

  private readonly api = inject(LocalGoApiService);
  private readonly session = inject(SessionStateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  async ngOnInit(): Promise<void> {
    const queryRequestId = this.route.snapshot.queryParamMap.get('requestId');
    const requestId = queryRequestId ?? this.session.requesterRequestId;
    if (queryRequestId) {
      this.session.requesterRequestId = queryRequestId;
    }
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
      if (requestId) {
        await this.loadExistingReview(resolvedProviderId, requestId);
      }
    }
  }

  protected updateComment(value: string): void {
    this.comment.set(value.slice(0, REVIEW_COMMENT_MAX));
  }

  protected onStarKey(event: KeyboardEvent, star: number): void {
    let next = star;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      next = Math.min(5, star + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      next = Math.max(1, star - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      this.setRating(star);
      return;
    } else {
      return;
    }
    event.preventDefault();
    this.setRating(next);
    queueMicrotask(() => document.getElementById(`review-star-${next}`)?.focus());
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
    const rating = this.rating();
    if (!this.canSubmit()) {
      this.error.set('ยังส่งรีวิวไม่ได้ — รอให้งานเสร็จสิ้นก่อน');
      return;
    }
    if (rating == null) {
      this.error.set('กรุณาให้คะแนน');
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.createReview(providerId, {
          serviceRequestId: requestId ?? undefined,
          reviewType: 'Verified',
          rating,
          comment: this.comment().trim() || undefined,
        }),
      );
      this.session.clearRequesterFlow();
      await this.router.navigate(['/requester'], {
        state: {
          notice: 'ส่งรีวิวแล้ว ขอบคุณสำหรับคะแนน',
          reviewedRequestId: requestId,
          reviewedRating: rating,
        },
      });
    } catch (e) {
      const already = await this.reconcileSavedReview(providerId, requestId);
      if (already || (e instanceof HttpErrorResponse && e.status === 409)) {
        this.error.set('คุณรีวิวงานนี้แล้ว');
        this.canSubmit.set(false);
        return;
      }
      this.error.set(apiErrorMessage(e, 'ส่งรีวิวไม่สำเร็จ'));
    } finally {
      this.submitting.set(false);
    }
  }

  private async loadExistingReview(providerId: string, requestId: string): Promise<void> {
    try {
      const existing = await firstValueFrom(this.api.findMyReview(providerId, requestId));
      if (existing) {
        this.savedReview.set(existing);
        this.canSubmit.set(false);
        this.statusHint.set('คุณรีวิวงานนี้แล้ว');
      }
    } catch {
      /* a missing review is not an error */
    }
  }

  private async reconcileSavedReview(providerId: string, requestId: string | null): Promise<boolean> {
    if (!requestId) {
      return false;
    }
    try {
      const existing = await firstValueFrom(this.api.findMyReview(providerId, requestId));
      if (!existing) {
        return false;
      }
      this.savedReview.set(existing);
      this.statusHint.set('คุณรีวิวงานนี้แล้ว');
      return true;
    } catch {
      return false;
    }
  }
}
