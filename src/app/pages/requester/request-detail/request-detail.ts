import { HttpErrorResponse } from '@angular/common/http';
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
  protected readonly notFound = signal(false);
  protected readonly statusLabel = requestStatusLabel;
  protected readonly formatBaht = formatBaht;

  private readonly api = inject(LocalGoApiService);
  private readonly route = inject(ActivatedRoute);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async retry(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    this.loading.set(true);
    this.error.set(null);
    this.notFound.set(false);
    this.request.set(null);
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    try {
      this.request.set(await firstValueFrom(this.api.getRequest(id)));
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 404) {
        this.notFound.set(true);
      } else {
        this.error.set(apiErrorMessage(e, 'โหลดรายละเอียดงานไม่สำเร็จ'));
      }
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
