import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { RequesterBottomNav } from '../../../shared/requester-bottom-nav';
import { RequesterFlowBar, RequesterFlowStep } from '../../../shared/requester-flow-bar';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { SessionStateService } from '../../../core/session-state.service';
import { MarketplaceCacheService } from '../../../core/marketplace-cache.service';
import { ToastService } from '../../../core/toast.service';
import { apiErrorMessage } from '../../../core/api-error.util';
import { SkeletonCard } from '../../../shared/ui/skeleton-card';
import { ErrorState } from '../../../shared/ui/error-state';
import { scrollToFirstError } from '../../../shared/scroll-to-first-error';
import { ConfirmSaveDialog } from '../../../shared/forms/confirm-save-dialog';
import { DirtyFormGuardState } from '../../../shared/forms/dirty-form.guard';
import { UseDirtyGuard } from '../../../shared/forms/use-dirty-guard';
import { GLOSSARY } from '../../../shared/glossary';
import { buildReviewConfirmMessage } from '../../../shared/confirm-copy';

@Component({
  selector: 'app-review-page',
  imports: [PageShell, RequesterBottomNav, RequesterFlowBar, SkeletonCard, RouterLink, ConfirmSaveDialog, ErrorState],
  templateUrl: './review.html',
})
export class ReviewPage implements OnInit {
  protected readonly GLOSSARY = GLOSSARY;
  protected readonly rating = signal(0);
  protected readonly comment = signal('');
  protected readonly providerName = signal('กำลังโหลดผู้ให้บริการ…');
  protected readonly providerId = signal<string | null>(null);
  protected readonly requestId = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly canSubmit = signal(false);
  protected readonly statusHint = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(true);
  /** A5-1: GET failure → error state with retry. */
  protected readonly loadError = signal<string | null>(null);
  /** R-3: review already exists (from list hasReviewed or a 409 on POST) → read-only, no POST. */
  protected readonly alreadyReviewed = signal(false);
  protected readonly reviewedRating = signal<number | null>(null);
  protected readonly saveConfirmOpen = signal(false);
  protected readonly saveConfirmMessage = signal('');
  protected readonly discardConfirmOpen = signal(false);

  private readonly api = inject(LocalGoApiService);
  private readonly session = inject(SessionStateService);
  private readonly cache = inject(MarketplaceCacheService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dirty = inject(DirtyFormGuardState);
  private readonly formGuard = new UseDirtyGuard(this.dirty);
  private baselineSummary: ReturnType<typeof this.formSnapshot> | null = null;

  protected async retryLoad(): Promise<void> {
    await this.ngOnInit();
  }

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    const queryRequestId = this.route.snapshot.queryParamMap.get('requestId');
    const requestId = queryRequestId ?? this.session.requesterRequestId;
    if (queryRequestId) {
      this.session.requesterRequestId = queryRequestId;
    }
    this.requestId.set(requestId);

    if (!requestId) {
      this.statusHint.set('ไม่พบงานที่จะรีวิว');
      this.providerName.set('ไม่พบผู้ให้บริการ');
      this.canSubmit.set(false);
      this.loading.set(false);
      void this.router.navigateByUrl('/requester');
      return;
    }

    try {
      const [detail, appointment, mine] = await Promise.all([
        firstValueFrom(this.api.getRequest(requestId)),
        firstValueFrom(this.api.getAppointment(requestId)),
        firstValueFrom(this.cache.listMyRequests(true)).catch(() => []),
      ]);
      const summary = mine.find((r) => r.id === requestId);
      this.alreadyReviewed.set(!!summary?.hasReviewed);
      this.reviewedRating.set(summary?.myReviewRating ?? null);

      const ready = detail.status === 'Completed' && !this.alreadyReviewed();
      this.canSubmit.set(ready);
      if (!ready) {
        this.statusHint.set('รอให้งานเสร็จก่อนรีวิว');
      }

      const resolved =
        appointment?.providerId ??
        detail.selectedProviderId ??
        detail.bids?.find((b) => b.status === 'Selected')?.providerId ??
        null;

      if (!resolved) {
        this.statusHint.set('ไม่พบผู้ให้บริการของงานนี้');
        this.providerName.set('ไม่พบผู้ให้บริการ');
        this.loading.set(false);
        return;
      }

      this.providerId.set(resolved);
      this.session.currentProviderId = resolved;

      const p = await firstValueFrom(this.api.getProvider(resolved));
      this.providerName.set(p.name);
    } catch (e) {
      this.canSubmit.set(false);
      this.loadError.set(apiErrorMessage(e, 'โหลดข้อมูลไม่สำเร็จ'));
    } finally {
      this.loading.set(false);
      this.captureBaseline();
    }
  }

  private formSnapshot(): { rating: number; comment: string } {
    return {
      rating: this.rating(),
      comment: this.comment().trim(),
    };
  }

  private captureBaseline(): void {
    const state = this.formSnapshot();
    this.formGuard.captureBaseline(state);
    this.baselineSummary = { ...state };
  }

  protected touchForm(): void {
    this.formGuard.syncDirty(this.formSnapshot());
  }

  protected hasChanges(): boolean {
    return this.formGuard.hasChanges(this.formSnapshot());
  }

  protected flowUnlockedThrough(): RequesterFlowStep {
    return this.canSubmit() ? 'review' : 'appointment';
  }

  protected setRating(value: number): void {
    this.rating.set(value);
    this.error.set(null);
    this.touchForm();
  }

  protected updateComment(value: string): void {
    this.comment.set(value);
    this.touchForm();
  }

  protected askSave(): void {
    if (this.submitting() || !this.hasChanges()) {
      return;
    }
    const cur = this.formSnapshot();
    this.saveConfirmMessage.set(buildReviewConfirmMessage(this.baselineSummary, cur));
    this.saveConfirmOpen.set(true);
  }

  protected confirmSaveDialog(): void {
    if (this.submitting()) {
      return;
    }
    this.saveConfirmOpen.set(false);
    void this.submit();
  }

  protected cancelSaveDialog(): void {
    this.saveConfirmOpen.set(false);
  }

  protected cancelDiscardDialog(): void {
    this.discardConfirmOpen.set(false);
  }

  protected async submit(): Promise<void> {
    const providerId = this.providerId();
    const requestId = this.requestId() ?? this.session.requesterRequestId;
    // R-2: a second tap while sending is a no-op (no navigate → no discard sheet, single POST).
    if (this.submitting()) {
      return;
    }
    if (!providerId || !requestId) {
      await this.router.navigateByUrl('/requester');
      return;
    }
    if (!this.canSubmit()) {
      this.error.set('ยังส่งรีวิวไม่ได้ — รอให้งานเสร็จสิ้นก่อน');
      scrollToFirstError();
      return;
    }
    if (this.rating() < 1) {
      this.error.set('กรุณาให้คะแนนอย่างน้อย 1 ดาว');
      scrollToFirstError();
      return;
    }
    const stars = this.rating();
    const name = this.providerName();
    this.submitting.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.createReview(providerId, {
          serviceRequestId: requestId,
          reviewType: 'Verified',
          rating: stars,
          comment: this.comment().trim() || undefined,
        }),
      );
      // R-1: success toast only after the server confirmed (2xx).
      this.toast.show(`ส่งรีวิว ${stars} ดาวให้ ${name} แล้ว`);
      this.cache.invalidateAll();
      this.formGuard.markSaved(this.formSnapshot());
      this.session.clearRequesterFlow();
      await this.router.navigateByUrl('/requester');
    } catch (e) {
      const status = (e as { status?: number } | null)?.status ?? -1;
      if (status === 409) {
        // R-3: server says a review already exists → switch to read-only, not an error.
        this.alreadyReviewed.set(true);
        this.reviewedRating.set(stars);
        this.canSubmit.set(false);
        this.cache.invalidateMyRequests();
        this.formGuard.markSaved(this.formSnapshot());
        this.submitting.set(false);
        return;
      }
      // A5-14/R-4: say explicitly that the review was NOT sent.
      const detail = status === 0 || status >= 500 ? 'ระบบขัดข้องชั่วคราว กรุณาลองใหม่' : apiErrorMessage(e, 'กรุณาลองใหม่');
      this.error.set(`ส่งรีวิวไม่สำเร็จ ${detail}`);
      this.submitting.set(false);
      setTimeout(() => (document.getElementById('review-error') as HTMLElement | null)?.focus(), 0);
    } finally {
      this.submitting.set(false);
    }
  }
}
