import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { ServiceRequestDetail } from '../../../core/models';
import { SessionStateService } from '../../../core/session-state.service';
import { apiErrorMessage } from '../../../core/api-error.util';
import { LoadingSkeleton } from '../../../shared/loading-skeleton';

@Component({
  selector: 'app-submit-bid-page',
  imports: [PageShell, RouterLink, LoadingSkeleton],
  templateUrl: './submit-bid.html',
})
export class SubmitBidPage implements OnInit {
  protected readonly request = signal<ServiceRequestDetail | null>(null);
  protected readonly priceText = signal('');
  protected readonly description = signal('');
  protected readonly existingBidId = signal<string | null>(null);
  protected readonly providerId = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  private readonly api = inject(LocalGoApiService);
  private readonly session = inject(SessionStateService);
  private readonly router = inject(Router);

  protected backLink(): string {
    const id = this.request()?.id;
    return id ? `/provider/requests/${id}` : '/provider/requests';
  }

  async ngOnInit(): Promise<void> {
    const requestId = this.session.providerRequestId;
    if (!requestId) {
      this.loading.set(false);
      this.error.set('เลือกงานจากรายการก่อน');
      return;
    }
    try {
      const [detail, myProvider] = await Promise.all([
        firstValueFrom(this.api.getRequest(requestId)),
        firstValueFrom(this.api.getMyProvider()),
      ]);
      this.providerId.set(myProvider.id);
      this.request.set(detail);
      const existing = detail.bids?.find(
        (bid) => bid.providerId === myProvider.id && bid.status === 'Submitted',
      );
      if (existing) {
        this.existingBidId.set(existing.id);
        this.priceText.set(existing.priceText);
        this.description.set(existing.description ?? '');
      }
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'โหลดงานไม่สำเร็จ'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async submit(): Promise<void> {
    const requestId = this.session.providerRequestId;
    const providerId = this.providerId();
    if (!requestId || !providerId || !this.priceText().trim() || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    try {
      const payload = {
        priceText: this.priceText().trim(),
        description: this.description().trim() || undefined,
      };
      const bidId = this.existingBidId();
      if (bidId) {
        await firstValueFrom(this.api.updateBid(bidId, payload));
      } else {
        await firstValueFrom(this.api.submitBid(requestId, payload));
      }
      await this.router.navigate(['/provider/requests', requestId]);
    } catch (e) {
      const recovered = await this.recoverAfterSubmitError(requestId, providerId, e);
      if (recovered) {
        await this.router.navigate(['/provider/requests', requestId], {
          state: { notice: 'ระบบบันทึกข้อเสนอแล้ว แม้ตอบกลับผิดพลาด กรุณาตรวจสอบสถานะล่าสุด' },
        });
      } else {
        this.error.set(apiErrorMessage(e, 'ส่งข้อเสนอไม่สำเร็จ'));
      }
    } finally {
      this.submitting.set(false);
    }
  }

  private async recoverAfterSubmitError(
    requestId: string,
    providerId: string,
    error: unknown,
  ): Promise<boolean> {
    if (!(error instanceof HttpErrorResponse) || !this.isRecoverableSubmitError(error.status)) {
      return false;
    }
    try {
      const detail = await firstValueFrom(this.api.getRequest(requestId));
      this.request.set(detail);
      const myBid = detail.bids?.find((bid) => bid.providerId === providerId);
      if (!myBid || !this.isActiveBidStatus(myBid.status)) {
        return false;
      }
      this.existingBidId.set(myBid.id);
      this.priceText.set(myBid.priceText);
      this.description.set(myBid.description ?? '');
      return true;
    } catch {
      return false;
    }
  }

  private isRecoverableSubmitError(status: number): boolean {
    return status === 0 || status === 409 || status >= 500;
  }

  private isActiveBidStatus(status: string): boolean {
    return status === 'Submitted' || status === 'Pending' || status === 'Selected';
  }
}
