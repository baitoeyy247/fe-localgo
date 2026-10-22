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
import { scrollToFirstError } from '../../../shared/scroll-to-first-error';
import { ConfirmSaveDialog } from '../../../shared/forms/confirm-save-dialog';
import { DirtyFormGuardState } from '../../../shared/forms/dirty-form.guard';
import { UseDirtyGuard } from '../../../shared/forms/use-dirty-guard';
import { GLOSSARY } from '../../../shared/glossary';
import { buildReviewConfirmMessage } from '../../../shared/confirm-copy';

@Component({
  selector: 'app-review-page',
  imports: [PageShell, RequesterBottomNav, RequesterFlowBar, SkeletonCard, RouterLink, ConfirmSaveDialog],
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

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
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
      const [detail, appointment] = await Promise.all([
        firstValueFrom(this.api.getRequest(requestId)),
        firstValueFrom(this.api.getAppointment(requestId)),
      ]);

      const ready = detail.status === 'Completed';
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
      this.statusHint.set(apiErrorMessage(e, 'โหลดสถานะงานไม่สำเร็จ — ลองกลับมาอีกครั้ง'));
      this.providerName.set('โหลดชื่อไม่สำเร็จ');
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
    if (!this.hasChanges()) {
      return;
    }
    const cur = this.formSnapshot();
    this.saveConfirmMessage.set(buildReviewConfirmMessage(this.baselineSummary, cur));
    this.saveConfirmOpen.set(true);
  }

  protected confirmSaveDialog(): void {
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
    if (!providerId || !requestId || this.submitting()) {
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
    this.submitting.set(true);
    this.error.set(null);
    const stars = this.rating();
    const name = this.providerName();
    try {
      await firstValueFrom(
        this.api.createReview(providerId, {
          serviceRequestId: requestId,
          reviewType: 'Verified',
          rating: stars,
          comment: this.comment().trim() || undefined,
        }),
      );
      this.cache.invalidateAll();
      this.formGuard.markSaved(this.formSnapshot());
      this.session.clearRequesterFlow();
      this.toast.show(`ส่งรีวิว ${stars} ดาวให้ ${name} แล้ว`);
      await this.router.navigateByUrl('/requester');
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'ส่งรีวิวไม่สำเร็จ'));
      scrollToFirstError();
    } finally {
      this.submitting.set(false);
    }
  }
}
