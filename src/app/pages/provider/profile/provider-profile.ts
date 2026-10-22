import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { MarketplaceCacheService } from '../../../core/marketplace-cache.service';
import { ProviderDetail } from '../../../core/models';
import { PROVIDER_TYPE_OPTIONS } from '../../../shared/status-labels';
import { ProviderSetupBar } from '../../../shared/provider-setup-bar';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { apiErrorMessage } from '../../../core/api-error.util';
import { scrollToFirstError } from '../../../shared/scroll-to-first-error';
import { ToastService } from '../../../core/toast.service';
import { SkeletonCard } from '../../../shared/ui/skeleton-card';
import { ConfirmSaveDialog } from '../../../shared/forms/confirm-save-dialog';
import { DirtyFormGuardState } from '../../../shared/forms/dirty-form.guard';
import { UseDirtyGuard } from '../../../shared/forms/use-dirty-guard';

@Component({
  selector: 'app-provider-profile-setup-page',
  imports: [PageShell, ProviderSetupBar, ProviderBottomNav, SkeletonCard, ConfirmSaveDialog],
  templateUrl: './provider-profile.html',
})
export class ProviderProfileSetupPage implements OnInit {
  private readonly toast = inject(ToastService);
  private readonly dirty = inject(DirtyFormGuardState);
  private readonly formGuard = new UseDirtyGuard(this.dirty);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly provider = signal<ProviderDetail | null>(null);
  protected readonly providerType = signal('');
  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly contactLineId = signal('');
  protected readonly contactPhone = signal('');
  protected readonly typeOptions = PROVIDER_TYPE_OPTIONS;
  protected readonly error = signal<string | null>(null);
  protected readonly fieldErrors = signal<Record<string, string>>({});
  protected readonly saveConfirmOpen = signal(false);
  protected readonly saveConfirmMessage = signal('');
  protected readonly discardConfirmOpen = signal(false);
  private baselineSummary: ReturnType<typeof this.formSnapshot> | null = null;
  private readonly api = inject(LocalGoApiService);
  private readonly marketplaceCache = inject(MarketplaceCacheService);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    try {
      const mine = await firstValueFrom(this.marketplaceCache.getMyProvider());
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
      this.captureBaseline();
    }
  }

  private formSnapshot(): {
    providerType: string;
    name: string;
    description: string;
    contactLineId: string;
    contactPhone: string;
  } {
    return {
      providerType: this.providerType(),
      name: this.name().trim(),
      description: this.description().trim(),
      contactLineId: this.contactLineId().trim(),
      contactPhone: this.contactPhone().trim(),
    };
  }

  private captureBaseline(): void {
    const state = this.formSnapshot();
    this.formGuard.captureBaseline(state);
    this.baselineSummary = { ...state };
  }

  protected touchForm(): void {
    this.formGuard.syncDirty(this.formSnapshot());
  }

  protected hasChanges(): boolean {
    return this.formGuard.hasChanges(this.formSnapshot());
  }

  protected selectProviderType(value: string): void {
    this.providerType.set(value);
    this.touchForm();
  }

  protected updateName(value: string): void {
    this.name.set(value);
    this.touchForm();
  }

  protected updateDescription(value: string): void {
    this.description.set(value);
    this.touchForm();
  }

  protected updateContactLine(value: string): void {
    this.contactLineId.set(value);
    this.touchForm();
  }

  protected updateContactPhone(value: string): void {
    this.contactPhone.set(value);
    this.touchForm();
  }

  protected askSave(): void {
    if (!this.hasChanges()) {
      return;
    }
    const prev = this.baselineSummary;
    const cur = this.formSnapshot();
    const lines: string[] = [];
    if (prev && prev.providerType !== cur.providerType) {
      lines.push(`ประเภท: ${prev.providerType || '—'} → ${cur.providerType || '—'}`);
    }
    if (prev && prev.name !== cur.name) {
      lines.push(`ชื่อ: ${prev.name || '—'} → ${cur.name || '—'}`);
    }
    if (prev && prev.description !== cur.description) {
      lines.push('รายละเอียด: มีการแก้ไข');
    }
    if (prev && prev.contactLineId !== cur.contactLineId) {
      lines.push(`LINE: ${prev.contactLineId || '—'} → ${cur.contactLineId || '—'}`);
    }
    if (prev && prev.contactPhone !== cur.contactPhone) {
      lines.push(`เบอร์โทร: ${prev.contactPhone || '—'} → ${cur.contactPhone || '—'}`);
    }
    this.saveConfirmMessage.set(this.formGuard.buildSaveMessage(lines));
    this.saveConfirmOpen.set(true);
  }

  protected confirmSaveDialog(): void {
    this.saveConfirmOpen.set(false);
    void this.saveAndContinue();
  }

  protected cancelSaveDialog(): void {
    this.saveConfirmOpen.set(false);
  }

  protected cancelDiscardDialog(): void {
    this.discardConfirmOpen.set(false);
  }

  protected async saveAndContinue(): Promise<void> {
    if (this.saving()) {
      return;
    }
    const errors: Record<string, string> = {};
    if (!this.provider() && !this.providerType()) {
      errors['providerType'] = 'กรุณาเลือกประเภทผู้ให้บริการ';
    }
    if (!this.name().trim()) {
      errors['name'] = 'กรุณาระบุชื่อที่แสดง';
    }
    this.fieldErrors.set(errors);
    this.error.set(null);
    if (Object.keys(errors).length > 0) {
      scrollToFirstError();
      return;
    }
    this.saving.set(true);
    const displayName = this.name().trim();
    try {
      const existing = this.provider();
      if (existing) {
        const updated = await firstValueFrom(
          this.api.updateProvider(existing.id, {
            name: displayName,
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
            name: displayName,
            description: this.description().trim() || undefined,
            contactLineId: this.contactLineId().trim() || undefined,
            contactPhone: this.contactPhone().trim() || undefined,
          }),
        );
        this.provider.set(created);
      }
      this.formGuard.markSaved(this.formSnapshot());
      this.captureBaseline();
      this.toast.show(`บันทึกโปรไฟล์ '${displayName}' แล้ว · ไปตั้งพื้นที่ให้บริการ`);
      await this.router.navigateByUrl('/provider/coverage');
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'บันทึกโปรไฟล์ไม่สำเร็จ'));
      scrollToFirstError();
    } finally {
      this.saving.set(false);
    }
  }
}
