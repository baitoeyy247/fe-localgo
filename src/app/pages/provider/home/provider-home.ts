import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { ProviderDetail } from '../../../core/models';
import { LoadingSkeleton } from '../../../shared/loading-skeleton';

@Component({
  selector: 'app-provider-home-page',
  imports: [PageShell, RouterLink, ProviderBottomNav, LoadingSkeleton],
  templateUrl: './provider-home.html',
})
export class ProviderHomePage implements OnInit {
  protected readonly provider = signal<ProviderDetail | null>(null);
  protected readonly hasProfile = signal(false);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pendingConfirmCount = signal(0);

  constructor(private readonly api: LocalGoApiService) {}

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  protected async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const mine = await firstValueFrom(this.api.getMyProvider());
      this.provider.set(mine);
      this.hasProfile.set(true);
      try {
        const summary = await firstValueFrom(this.api.getProviderSummary());
        this.pendingConfirmCount.set(summary.pendingConfirmCount ?? 0);
      } catch {
        this.pendingConfirmCount.set(0);
      }
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 404) {
        this.hasProfile.set(false);
      } else {
        this.error.set(e instanceof HttpErrorResponse ? 'โหลดข้อมูลไม่สำเร็จ' : 'โหลดข้อมูลไม่สำเร็จ');
      }
    } finally {
      this.loading.set(false);
    }
  }

  protected activeServiceCount(): number {
    return this.provider()?.services.filter((service) => service.isActive).length ?? 0;
  }

  protected pausedServiceCount(): number {
    return (this.provider()?.services.length ?? 0) - this.activeServiceCount();
  }

  protected activeAreaCount(): number {
    return this.provider()?.branches.filter((branch) => branch.isActive).length ?? 0;
  }

  protected disabledAreaCount(): number {
    return (this.provider()?.branches.length ?? 0) - this.activeAreaCount();
  }

  protected setupDone(): boolean {
    const p = this.provider();
    return !!p && p.branches.length > 0 && p.services.length > 0;
  }

}
