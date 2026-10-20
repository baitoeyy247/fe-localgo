import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { ProviderDetail } from '../../../core/models';
import { PROVIDER_TYPE_OPTIONS, providerTypeLabel } from '../../../shared/status-labels';
import { thaiMobileError } from '../../../shared/form-rules';
import { LoadingSkeleton } from '../../../shared/loading-skeleton';
import { ProviderSetupBar } from '../../../shared/provider-setup-bar';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { FieldError } from '../../../shared/field-error';
import { focusFirstInvalid } from '../../../shared/focus-invalid';
import { AuthService } from '../../../core/auth.service';
import { apiErrorMessage } from '../../../core/api-error.util';

@Component({
  selector: 'app-provider-profile-setup-page',
  imports: [PageShell, ProviderSetupBar, ProviderBottomNav, LoadingSkeleton, FieldError],
  templateUrl: './provider-profile.html',
})
export class ProviderProfileSetupPage implements OnInit {
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly editing = signal(false);
  protected readonly switching = signal(false);
  protected readonly loggingOut = signal(false);
  protected readonly provider = signal<ProviderDetail | null>(null);
  protected readonly providerType = signal('');
  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly contactLineId = signal('');
  protected readonly contactPhone = signal('');
  protected readonly phoneError = signal<string | null>(null);
  protected readonly nameError = signal<string | null>(null);
  protected readonly typeError = signal<string | null>(null);
  protected readonly saveError = signal<string | null>(null);
  protected readonly typeOptions = PROVIDER_TYPE_OPTIONS;
  protected readonly typeLabel = providerTypeLabel;
  private readonly api = inject(LocalGoApiService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  async ngOnInit(): Promise<void> {
    try {
      const mine = await firstValueFrom(this.api.getMyProvider());
      this.applyProvider(mine);
    } catch (e) {
      if (!(e instanceof HttpErrorResponse) || e.status !== 404) {
        this.saveError.set(apiErrorMessage(e, 'โหลดโปรไฟล์ไม่สำเร็จ'));
      } else {
        this.editing.set(true);
      }
    } finally {
      this.loading.set(false);
    }
  }

  protected selectProviderType(value: string): void {
    this.providerType.set(value);
    this.typeError.set(null);
  }

  protected updateName(value: string): void {
    this.name.set(value);
    this.nameError.set(null);
  }

  protected updateDescription(value: string): void {
    this.description.set(value);
  }

  protected updateContactLine(value: string): void {
    this.contactLineId.set(value);
  }

  protected updateContactPhone(value: string): void {
    this.contactPhone.set(value);
    this.phoneError.set(thaiMobileError(value));
  }

  protected beginEdit(): void {
    this.editing.set(true);
  }

  protected pressSave(event: Event): void {
    if (this.saving()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.saving.set(true);
    void this.saveAndContinue();
  }

  protected switchRole(): void {
    if (this.switching()) {
      return;
    }
    this.switching.set(true);
    void this.auth.setActiveRole('Requester').then(() => this.router.navigateByUrl('/requester'));
  }

  protected logout(): void {
    if (this.loggingOut()) {
      return;
    }
    this.loggingOut.set(true);
    this.auth.clearSession();
    void this.router.navigateByUrl('/');
  }

  protected async saveAndContinue(): Promise<void> {
    const phoneError = thaiMobileError(this.contactPhone());
    const typeError = this.providerType().trim() ? null : 'กรุณาเลือกประเภทผู้ให้บริการ';
    this.phoneError.set(phoneError);
    this.nameError.set(this.name().trim() ? null : 'กรุณากรอกชื่อที่แสดง');
    this.typeError.set(typeError);
    if (phoneError || !this.name().trim() || typeError) {
      this.saving.set(false);
      setTimeout(() => focusFirstInvalid());
      return;
    }
    this.saveError.set(null);
    try {
      const existing = this.provider();
      const line = this.contactLineId().trim();
      const phone = this.contactPhone().trim();
      if (existing) {
        const updated = await firstValueFrom(
          this.api.updateProvider(existing.id, {
            name: this.name().trim(),
            description: this.description().trim() || undefined,
            contactLineId: line,
            contactPhone: phone || undefined,
          }),
        );
        this.applyProvider(updated);
        this.editing.set(false);
      } else {
        const created = await firstValueFrom(
          this.api.createProvider({
            providerType: this.providerType(),
            name: this.name().trim(),
            description: this.description().trim() || undefined,
            contactLineId: line,
            contactPhone: phone || undefined,
          }),
        );
        this.applyProvider(created);
        await this.router.navigateByUrl('/provider/coverage');
      }
    } catch (e) {
      this.saveError.set(apiErrorMessage(e, 'บันทึกโปรไฟล์ไม่สำเร็จ'));
    } finally {
      this.saving.set(false);
    }
  }

  private applyProvider(mine: ProviderDetail): void {
    this.provider.set(mine);
    this.providerType.set(mine.providerType);
    this.name.set(mine.name);
    this.description.set(mine.description ?? '');
    const phone = mine.contactPhone ?? '';
    const line = mine.contactLineId ?? '';
    this.contactPhone.set(phone);
    this.contactLineId.set(line && line === phone ? '' : line);
  }
}
