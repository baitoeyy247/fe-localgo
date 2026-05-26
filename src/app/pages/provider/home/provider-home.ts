import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { ProviderDetail } from '../../../core/models';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-provider-home-page',
  imports: [PageShell, RouterLink, ProviderBottomNav],
  templateUrl: './provider-home.html',
})
export class ProviderHomePage implements OnInit {
  protected readonly provider = signal<ProviderDetail | null>(null);
  protected readonly hasProfile = signal(false);
  protected readonly loading = signal(true);

  constructor(
    private readonly api: LocalGoApiService,
    protected readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const mine = await firstValueFrom(this.api.getMyProvider());
      this.provider.set(mine);
      this.hasProfile.set(true);
    } catch (e) {
      if (!(e instanceof HttpErrorResponse) || e.status !== 404) {
        throw e;
      }
    } finally {
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
