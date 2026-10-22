import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { ProviderDetail, ServiceRequestSummary } from '../../../core/models';
import { AuthService } from '../../../core/auth.service';
import { apiErrorMessage } from '../../../core/api-error.util';
import { SlowLoadHint } from '../../../shared/load-state';
import { ErrorState } from '../../../shared/ui/error-state';
import { SkeletonCard } from '../../../shared/ui/skeleton-card';
import { formatVerifiedRatingLine } from '../../../shared/format-verified-rating';
import { GLOSSARY } from '../../../shared/glossary';

@Component({
  selector: 'app-provider-home-page',
  imports: [PageShell, RouterLink, ProviderBottomNav, ErrorState, SkeletonCard],
  templateUrl: './provider-home.html',
})
export class ProviderHomePage implements OnInit, OnDestroy {
  protected readonly GLOSSARY = GLOSSARY;
  protected readonly provider = signal<ProviderDetail | null>(null);
  protected readonly hasProfile = signal(false);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pendingConfirmCount = signal(0);
  protected readonly hint = new SlowLoadHint();
  protected readonly formatVerifiedRatingLine = formatVerifiedRatingLine;

  constructor(
    private readonly api: LocalGoApiService,
    protected readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  ngOnDestroy(): void {
    this.hint.end();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.hint.begin();
    try {
      const [mine, matching] = await Promise.all([
        firstValueFrom(this.api.getMyProvider()),
        firstValueFrom(this.api.listMatchingRequests()).catch(() => [] as ServiceRequestSummary[]),
      ]);
      this.provider.set(mine);
      this.hasProfile.set(true);
      this.pendingConfirmCount.set(
        matching.filter((r) => r.needsAppointmentConfirm).length,
      );
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 404) {
        this.hasProfile.set(false);
      } else {
        this.error.set(apiErrorMessage(e, 'โหลดข้อมูลผู้ให้บริการไม่สำเร็จ'));
      }
    } finally {
      this.hint.end();
      this.loading.set(false);
    }
  }

  protected setupDone(): boolean {
    const p = this.provider();
    return !!p && p.branches.length > 0 && p.services.length > 0;
  }

  protected async switchToRequester(): Promise<void> {
    await this.auth.setActiveRole('Requester');
    await this.router.navigateByUrl('/requester');
  }
}
