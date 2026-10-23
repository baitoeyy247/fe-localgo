import { FitSourceDirective, FitTargetDirective } from '../../../shared/ui/skeleton-fit.directive';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { ProviderBidListItem } from '../../../core/models';
import { apiErrorMessage } from '../../../core/api-error.util';
import { formatPrice } from '../../../shared/format-price';
import {
  ProviderBidFilterKey,
  providerBidRowStatus,
} from '../../../shared/status-labels';
import { formatScheduledAt } from '../../../shared/datetime.util';
import { SlowLoadHint } from '../../../shared/load-state';
import { ErrorState } from '../../../shared/ui/error-state';
import { GLOSSARY } from '../../../shared/glossary';

const FILTER_CHIPS: { key: ProviderBidFilterKey; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'waiting', label: 'รอผล' },
  { key: 'selected', label: 'ถูกเลือก' },
  { key: 'confirm', label: GLOSSARY.pendingAppointmentConfirmChip },
  { key: 'inprogress', label: 'กำลังทำ' },
  { key: 'done', label: 'เสร็จ' },
  { key: 'withdrawn', label: 'ถอนแล้ว' },
];

@Component({
  selector: 'app-provider-my-bids-page',
  imports: [FitSourceDirective, FitTargetDirective, 
    PageShell,
    RouterLink,
    ProviderBottomNav,
    NgClass,
    ErrorState, ],
  templateUrl: './my-bids.html',
})
export class ProviderMyBidsPage implements OnInit, OnDestroy {
  protected readonly GLOSSARY = GLOSSARY;
  protected readonly items = signal<ProviderBidListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly filter = signal<ProviderBidFilterKey>('all');
  protected readonly chips = FILTER_CHIPS;
  protected readonly hint = new SlowLoadHint();
  protected readonly formatPrice = formatPrice;
  protected readonly rowStatus = providerBidRowStatus;
  protected readonly formatWhen = formatScheduledAt;

  protected readonly filtered = computed(() => {
    const key = this.filter();
    const list = this.items();
    if (key === 'all') {
      return list;
    }
    return list.filter((item) => providerBidRowStatus(item).key === key);
  });

  constructor(
    private readonly api: LocalGoApiService,
    private readonly router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  ngOnDestroy(): void {
    this.hint.end();
  }

  protected setFilter(key: ProviderBidFilterKey): void {
    this.filter.set(key);
  }

  protected ctaLabel(item: ProviderBidListItem): string {
    const view = providerBidRowStatus(item);
    if (view.key === 'confirm') {
      return GLOSSARY.confirmAppointment;
    }
    if (view.key === 'inprogress') {
      return 'ดำเนินงาน';
    }
    return 'ดูงาน';
  }

  protected async openItem(item: ProviderBidListItem): Promise<void> {
    await this.router.navigate(['/provider/requests', item.serviceRequestId]);
  }

  protected formatProposed(iso: string): string {
    try {
      return new Date(iso).toLocaleString('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.hint.begin();
    try {
      const list = await firstValueFrom(this.api.listMyProviderBids());
      this.items.set(list);
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'โหลดข้อเสนอไม่สำเร็จ'));
    } finally {
      this.hint.end();
      this.loading.set(false);
    }
  }
}
