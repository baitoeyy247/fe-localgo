import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { ProviderSetupBar } from '../../../shared/provider-setup-bar';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { Category, ProviderDetail } from '../../../core/models';
import { SERVICE_TITLE_MAX, priceTextError } from '../../../shared/form-rules';
import { LoadingSkeleton } from '../../../shared/loading-skeleton';
import { FieldError } from '../../../shared/field-error';
import { focusFirstInvalid } from '../../../shared/focus-invalid';
import { apiErrorMessage } from '../../../core/api-error.util';

@Component({
  selector: 'app-add-service-page',
  imports: [PageShell, RouterLink, ProviderSetupBar, ProviderBottomNav, LoadingSkeleton, FieldError],
  templateUrl: './add-service.html',
})
export class AddServicePage implements OnInit {
  protected readonly provider = signal<ProviderDetail | null>(null);
  protected readonly categories = signal<Category[]>([]);
  protected readonly selectedCategoryId = signal<string | null>(null);
  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly basePriceText = signal('');
  protected readonly selectedBranchIds = signal<Set<string>>(new Set());
  protected readonly saving = signal(false);
  protected readonly pausing = signal(false);
  protected readonly published = signal(false);
  protected readonly createdServiceId = signal<string | null>(null);
  protected readonly paused = signal(false);
  protected readonly loading = signal(true);
  protected readonly saveError = signal<string | null>(null);
  protected readonly titleMax = SERVICE_TITLE_MAX;
  protected readonly fieldErrors = signal<Partial<Record<'category' | 'title' | 'description' | 'price' | 'branch', string>>>({});

  constructor(private readonly api: LocalGoApiService) {}

  protected setupComplete(): boolean {
    const profile = this.provider();
    return !!profile && profile.branches.length > 0 && profile.services.length > 0;
  }

  async ngOnInit(): Promise<void> {
    const [cats, mine] = await Promise.allSettled([
      firstValueFrom(this.api.listCategories()),
      firstValueFrom(this.api.getMyProvider()),
    ]);
    this.categories.set(cats.status === 'fulfilled' ? cats.value : []);
    if (mine.status === 'fulfilled') {
      this.provider.set(mine.value);
      const activeBranches = mine.value.branches.filter((b) => b.isActive);
      this.selectedBranchIds.set(new Set(activeBranches.map((b) => b.id)));
    } else if (!(mine.reason instanceof HttpErrorResponse) || mine.reason.status !== 404) {
      this.saveError.set('โหลดโปรไฟล์ไม่สำเร็จ');
    }
    this.loading.set(false);
  }

  protected selectCategory(id: string): void {
    this.selectedCategoryId.set(id);
  }

  protected toggleBranch(branchId: string, checked: boolean): void {
    const next = new Set(this.selectedBranchIds());
    if (checked) {
      next.add(branchId);
    } else {
      next.delete(branchId);
    }
    this.selectedBranchIds.set(next);
  }

  protected isBranchSelected(branchId: string): boolean {
    return this.selectedBranchIds().has(branchId);
  }

  protected updateTitle(value: string): void {
    this.title.set(value.slice(0, SERVICE_TITLE_MAX));
  }

  protected updateDescription(value: string): void {
    this.description.set(value);
  }

  protected updateBasePrice(value: string): void {
    this.basePriceText.set(value);
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

  protected async saveAndContinue(): Promise<void> {
    const errors = this.validate();
    this.fieldErrors.set(errors);
    const p = this.provider();
    if (!p || Object.keys(errors).length > 0) {
      this.saving.set(false);
      setTimeout(() => focusFirstInvalid());
      return;
    }
    const categoryId = this.selectedCategoryId();
    if (!categoryId) {
      this.saving.set(false);
      return;
    }
    this.saveError.set(null);
    try {
      const branchIds = [...this.selectedBranchIds()];
      const service = await firstValueFrom(
        this.api.addService(p.id, {
          categoryId,
          title: this.title().trim(),
          description: this.description().trim() || undefined,
          basePriceText: this.basePriceText().trim() || undefined,
          branchIds: branchIds.length ? branchIds : undefined,
        }),
      );
      if (branchIds.length) {
        await firstValueFrom(this.api.setServiceBranches(p.id, service.id, branchIds));
      }
      this.createdServiceId.set(service.id);
      this.published.set(true);
    } catch (e) {
      this.saveError.set(apiErrorMessage(e, 'บันทึกบริการไม่สำเร็จ'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async pausePublished(): Promise<void> {
    const provider = this.provider();
    const serviceId = this.createdServiceId();
    if (!provider || !serviceId || this.pausing()) {
      return;
    }
    this.pausing.set(true);
    try {
      await firstValueFrom(this.api.setServiceActive(provider.id, serviceId, false));
      this.paused.set(true);
    } catch (e) {
      this.saveError.set(apiErrorMessage(e, 'หยุดบริการไม่สำเร็จ'));
    } finally {
      this.pausing.set(false);
    }
  }

  private validate(): Partial<Record<'category' | 'title' | 'description' | 'price' | 'branch', string>> {
    const errors: Partial<Record<'category' | 'title' | 'description' | 'price' | 'branch', string>> = {};
    if (!this.selectedCategoryId()) {
      errors.category = 'กรุณาเลือกหมวดหมู่';
    }
    const title = this.title().trim();
    if (!title) {
      errors.title = 'กรุณากรอกชื่อบริการ';
    } else if (title.length > SERVICE_TITLE_MAX) {
      errors.title = `ชื่อบริการต้องไม่เกิน ${SERVICE_TITLE_MAX} ตัวอักษร`;
    }
    if (!this.description().trim()) {
      errors.description = 'กรุณากรอกรายละเอียด';
    }
    const priceError = priceTextError(this.basePriceText());
    if (priceError) {
      errors.price = priceError;
    }
    const branches = this.provider()?.branches ?? [];
    if (branches.length > 0 && this.selectedBranchIds().size === 0) {
      errors.branch = 'กรุณาเลือกจุดให้บริการ';
    }
    return errors;
  }
}
