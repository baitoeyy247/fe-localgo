import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { LoadingSkeleton } from '../../../shared/loading-skeleton';
import { RequesterBottomNav } from '../../../shared/requester-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { ServiceRequestDetail } from '../../../core/models';
import { apiErrorMessage } from '../../../core/api-error.util';
import { requestStatusLabel } from '../../../shared/status-labels';
import { formatBaht } from '../../../shared/form-rules';

@Component({
  selector: 'app-requester-request-detail-page',
  imports: [PageShell, RouterLink, RequesterBottomNav, LoadingSkeleton],
  templateUrl: './request-detail.html',
})
export class RequesterRequestDetailPage implements OnInit {
  protected readonly request = signal<ServiceRequestDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly statusLabel = requestStatusLabel;
  protected readonly formatBaht = formatBaht;

  private readonly api = inject(LocalGoApiService);
  private readonly route = inject(ActivatedRoute);

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('ไม่พบงานนี้');
      this.loading.set(false);
      return;
    }
    try {
      this.request.set(await firstValueFrom(this.api.getRequest(id)));
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'โหลดรายละเอียดงานไม่สำเร็จ'));
    } finally {
      this.loading.set(false);
    }
  }

  protected isCancelled(): boolean {
    return this.request()?.status === 'Cancelled';
  }

  protected formatWhen(iso?: string | null): string {
    if (!iso) {
      return '';
    }
    try {
      return new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return iso;
    }
  }
}
