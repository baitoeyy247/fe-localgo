import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { ProviderDetail } from '../../../core/models';
import { PROVIDER_TYPE_OPTIONS } from '../../../shared/status-labels';
import { ProviderSetupBar } from '../../../shared/provider-setup-bar';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';

@Component({
  selector: 'app-provider-profile-setup-page',
  imports: [PageShell, ProviderSetupBar, ProviderBottomNav],
  templateUrl: './provider-profile.html',
})
export class ProviderProfileSetupPage implements OnInit {
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly provider = signal<ProviderDetail | null>(null);
  protected readonly providerType = signal('Shop');
  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly contactLineId = signal('');
  protected readonly contactPhone = signal('');
  protected readonly typeOptions = PROVIDER_TYPE_OPTIONS;
  private readonly api = inject(LocalGoApiService);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    try {
      const mine = await firstValueFrom(this.api.getMyProvider());
      this.provider.set(mine);
      this.providerType.set(mine.providerType);
      this.name.set(mine.name);
      this.description.set(mine.description ?? '');
      this.contactLineId.set(mine.contactLineId ?? '');
      this.contactPhone.set(mine.contactPhone ?? '');
    } catch (e) {
      if (!(e instanceof HttpErrorResponse) || e.status !== 404) {
        throw e;
      }
    } finally {
      this.loading.set(false);
    }
  }

  protected selectProviderType(value: string): void {
    this.providerType.set(value);
  }

  protected updateName(value: string): void {
    this.name.set(value);
  }

  protected updateDescription(value: string): void {
    this.description.set(value);
  }

  protected updateContactLine(value: string): void {
    this.contactLineId.set(value);
  }

  protected updateContactPhone(value: string): void {
    this.contactPhone.set(value);
  }

  protected async saveAndContinue(): Promise<void> {
    if (this.saving() || !this.name().trim()) {
      return;
    }
    this.saving.set(true);
    try {
      const existing = this.provider();
      if (existing) {
        const updated = await firstValueFrom(
          this.api.updateProvider(existing.id, {
            name: this.name().trim(),
            description: this.description().trim() || undefined,
            contactLineId: this.contactLineId().trim() || undefined,
            contactPhone: this.contactPhone().trim() || undefined,
          }),
        );
        this.provider.set(updated);
      } else {
        const created = await firstValueFrom(
          this.api.createProvider({
            providerType: this.providerType(),
            name: this.name().trim(),
            description: this.description().trim() || undefined,
            contactLineId: this.contactLineId().trim() || undefined,
            contactPhone: this.contactPhone().trim() || undefined,
          }),
        );
        this.provider.set(created);
      }
      await this.router.navigateByUrl('/provider/coverage');
    } finally {
      this.saving.set(false);
    }
  }
}
