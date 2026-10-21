import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { LoadingSkeleton } from '../../../shared/loading-skeleton';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { ProviderBidListItem } from '../../../core/models';
import { apiErrorMessage } from '../../../core/api-error.util';
import { bidStatusLabel, requestStatusLabel } from '../../../shared/status-labels';
import { formatBaht } from '../../../shared/form-rules';
import { formatScheduledAt } from '../../../shared/datetime.util';

type BidFilter = 'all' | 'pending' | 'active' | 'done';

@Component({
  selector: 'app-provider-my-bids-page',
  imports: [PageShell, RouterLink, ProviderBottomNav, LoadingSkeleton],
  templateUrl: './my-bids.html',
})
export class ProviderMyBidsPage implements OnInit {
  protected readonly bids = signal<ProviderBidListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly filter = signal<BidFilter>('all');
  protected readonly formatBaht = formatBaht;
  protected readonly bidStatusLabel = bidStatusLabel;
  protected readonly requestStatusLabel = requestStatusLabel;
  protected readonly formatScheduledAt = formatScheduledAt;
  protected readonly filters: { id: BidFilter; label: string }[] = [
    { id: 'all', label: 'ทั้งหมด' },
    { id: 'pending', label: 'รอยืนยันนัด' },
    { id: 'active', label: 'กำลังทำ' },
    { id: 'done', label: 'จบแล้ว' },
  ];

  private readonly api = inject(LocalGoApiService);
  private readonly route = inject(ActivatedRoute);

  async ngOnInit(): Promise<void> {
    const status = this.route.snapshot.queryParamMap.get('status');
    if (status === 'pending' || status === 'active' || status === 'done') {
      this.filter.set(status);
    }
    await this.reload();
  }

  protected async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.bids.set(await firstValueFrom(this.api.listMyBids()));
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'โหลดข้อมูลไม่สำเร็จ'));
    } finally {
      this.loading.set(false);
    }
  }

  protected setFilter(id: BidFilter): void {
    this.filter.set(id);
  }

  protected visibleBids(): ProviderBidListItem[] {
    const filter = this.filter();
    return this.bids().filter((bid) => {
      if (filter === 'pending') {
        return bid.appointmentStatus === 'Pending' || bid.requestStatus === 'Scheduled' && !bid.appointmentStatus;
      }
      if (filter === 'active') {
        return bid.appointmentStatus === 'Confirmed' || bid.appointmentStatus === 'InProgress' || bid.requestStatus === 'InProgress';
      }
      if (filter === 'done') {
        return bid.status === 'Rejected' || bid.status === 'Withdrawn' || bid.requestStatus === 'Completed' || bid.requestStatus === 'Cancelled' || bid.appointmentStatus === 'Completed';
      }
      return true;
    });
  }

  protected actionLabel(bid: ProviderBidListItem): string {
    if (bid.appointmentStatus === 'Pending') {
      return 'ยืนยันรับนัด';
    }
    if (bid.appointmentStatus === 'InProgress' || bid.requestStatus === 'InProgress') {
      return 'ดำเนินงานต่อ';
    }
    return 'ดูงาน';
  }
}
