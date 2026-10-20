import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { LoadingSkeleton } from '../../../shared/loading-skeleton';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { ProviderBidListItem } from '../../../core/models';
import { apiErrorMessage } from '../../../core/api-error.util';
import { bidStatusLabel } from '../../../shared/status-labels';
import { formatBaht } from '../../../shared/form-rules';

@Component({
  selector: 'app-provider-my-bids-page',
  imports: [PageShell, RouterLink, ProviderBottomNav, LoadingSkeleton],
  templateUrl: './my-bids.html',
})
export class ProviderMyBidsPage implements OnInit {
  protected readonly bids = signal<ProviderBidListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly formatBaht = formatBaht;
  protected readonly bidStatusLabel = bidStatusLabel;

  private readonly api = inject(LocalGoApiService);

  async ngOnInit(): Promise<void> {
    try {
      this.bids.set(await firstValueFrom(this.api.listMyBids()));
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'โหลดข้อเสนอไม่สำเร็จ'));
    } finally {
      this.loading.set(false);
    }
  }
}
