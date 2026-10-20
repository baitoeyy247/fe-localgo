import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { apiErrorMessage } from '../../../core/api-error.util';
import { SERVICE_TITLE_MAX, priceTextError } from '../../../shared/form-rules';
import { LoadingSkeleton } from '../../../shared/loading-skeleton';
import { FieldError } from '../../../shared/field-error';
import { focusFirstInvalid } from '../../../shared/focus-invalid';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { Category, ProviderDetail, ProviderService } from '../../../core/models';

@Component({
  selector: 'app-edit-service-page',
  imports: [PageShell, RouterLink, ProviderBottomNav, LoadingSkeleton, FieldError],
  templateUrl: './edit-service.html',
  styles: [
    `
      :host .confirm-modal {
        position: fixed;
        inset: 0;
        z-index: 40;
        display: grid;
        align-items: end;
        justify-items: center;
        padding: 1rem;
        background: rgba(16, 24, 31, 0.45);
      }
      :host .confirm-modal__sheet {
        width: min(100%, 28rem);
        display: grid;
        gap: 0.75rem;
        padding: 1.1rem;
        border-radius: 1rem;
        background: #fff;
      }
      :host .confirm-modal__sheet h2,
      :host .confirm-modal__sheet p {
        margin: 0;
      }
      :host .confirm-modal__actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
      }
      :host .confirm-modal__actions button {
        min-height: 2.75rem;
        border-radius: 0.9rem;
        font-weight: 800;
      }
      :host .confirm-modal__confirm {
        border: 0;
        background: #9a3412;
        color: #fff;
      }
    `,
  ],
})
export class EditServicePage implements OnInit {
  protected readonly provider = signal<ProviderDetail | null>(null);
  protected readonly service = signal<ProviderService | null>(null);
  protected readonly categories = signal<Category[]>([]);
  protected readonly selectedCategoryId = signal<string | null>(null);
  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly basePriceText = signal('');
  protected readonly selectedBranchIds = signal<Set<string>>(new Set());
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);
  protected readonly confirmDelete = signal(false);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly titleMax = SERVICE_TITLE_MAX;
  protected readonly fieldErrors = signal<Partial<Record<'category' | 'title' | 'price', string>>>({});

  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(LocalGoApiService);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    const serviceId = this.route.snapshot.paramMap.get('serviceId');
    if (!serviceId) {
      this.loading.set(false);
      return;
    }
    const [cats, mine] = await Promise.allSettled([
      firstValueFrom(this.api.listCategories()),
      firstValueFrom(this.api.getMyProvider()),
    ]);
    this.categories.set(cats.status === 'fulfilled' ? cats.value : []);
    try {
      if (mine.status !== 'fulfilled') {
        if (!(mine.reason instanceof HttpErrorResponse) || mine.reason.status !== 404) {
          this.error.set('โหลดโปรไฟล์ไม่สำเร็จ');
        }
        return;
      }
      this.provider.set(mine.value);
      const svc = mine.value.services.find((s) => s.id === serviceId);
      if (!svc) {
        return;
      }
      this.service.set(svc);
      this.selectedCategoryId.set(svc.categoryId);
      this.title.set(svc.title.slice(0, SERVICE_TITLE_MAX));
      this.description.set(svc.description ?? '');
      this.basePriceText.set(svc.basePriceText ?? '');
      const linked = svc.branchIds?.length
        ? new Set(svc.branchIds)
        : new Set(mine.value.branches.filter((b) => b.isActive).map((b) => b.id));
      this.selectedBranchIds.set(linked);
    } finally {
      this.loading.set(false);
    }
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

  protected pressSave(event: Event): void {
    if (this.saving()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.saving.set(true);
    void this.save();
  }

  protected askDelete(): void {
    this.confirmDelete.set(true);
  }

  protected dismissDelete(): void {
    if (this.deleting()) {
      return;
    }
    this.confirmDelete.set(false);
  }

  protected async confirmDeleteService(): Promise<void> {
    const provider = this.provider();
    const service = this.service();
    if (!provider || !service || this.deleting()) {
      return;
    }
    this.deleting.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.deleteService(provider.id, service.id));
      await this.router.navigateByUrl('/provider/manage');
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'ลบบริการไม่สำเร็จ'));
      this.deleting.set(false);
    }
  }

  protected async save(): Promise<void> {
    const p = this.provider();
    const svc = this.service();
    const errors = this.validate();
    this.fieldErrors.set(errors);
    if (!p || !svc || Object.keys(errors).length > 0) {
      this.saving.set(false);
      setTimeout(() => focusFirstInvalid());
      return;
    }
    this.error.set(null);
    try {
      const branchIds = [...this.selectedBranchIds()];
      await firstValueFrom(
        this.api.updateService(p.id, svc.id, {
          categoryId: this.selectedCategoryId()!,
          title: this.title().trim(),
          description: this.description().trim() || undefined,
          basePriceText: this.basePriceText().trim() || undefined,
          branchIds,
        }),
      );
      await this.router.navigateByUrl('/provider/manage');
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'บันทึกไม่สำเร็จ'));
    } finally {
      this.saving.set(false);
    }
  }

  private validate(): Partial<Record<'category' | 'title' | 'price', string>> {
    const errors: Partial<Record<'category' | 'title' | 'price', string>> = {};
    if (!this.selectedCategoryId()) {
      errors.category = 'กรุณาเลือกหมวดหมู่';
    }
    const title = this.title().trim();
    if (!title) {
      errors.title = 'กรุณากรอกชื่อบริการ';
    } else if (title.length > SERVICE_TITLE_MAX) {
      errors.title = `ชื่อบริการต้องไม่เกิน ${SERVICE_TITLE_MAX} ตัวอักษร`;
    }
    const priceError = priceTextError(this.basePriceText());
    if (priceError) {
      errors.price = priceError;
    }
    return errors;
  }
}
