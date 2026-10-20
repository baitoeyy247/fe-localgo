import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { ProviderSetupBar } from '../../../shared/provider-setup-bar';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { Category, ProviderDetail } from '../../../core/models';
import { priceTextError } from '../../../shared/form-rules';
import { LoadingSkeleton } from '../../../shared/loading-skeleton';

@Component({
  selector: 'app-add-service-page',
  imports: [PageShell, RouterLink, ProviderSetupBar, ProviderBottomNav, LoadingSkeleton],
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
  protected readonly loading = signal(true);
  protected readonly fieldErrors = signal<Partial<Record<'category' | 'title' | 'description' | 'price' | 'branch', string>>>({});

  constructor(
    private readonly api: LocalGoApiService,
    private readonly router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const cats = await firstValueFrom(this.api.listCategories());
      this.categories.set(cats);
    } catch {
      this.categories.set([]);
    }
    try {
      const mine = await firstValueFrom(this.api.getMyProvider());
      this.provider.set(mine);
      const activeBranches = mine.branches.filter((b) => b.isActive);
      this.selectedBranchIds.set(new Set(activeBranches.map((b) => b.id)));
    } catch (e) {
      if (!(e instanceof HttpErrorResponse) || e.status !== 404) {
        throw e;
      }
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
    this.title.set(value);
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
      return;
    }
    const categoryId = this.selectedCategoryId();
    if (!categoryId) {
      this.saving.set(false);
      return;
    }
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
      await this.router.navigateByUrl('/provider/manage');
    } finally {
      this.saving.set(false);
    }
  }

  private validate(): Partial<Record<'category' | 'title' | 'description' | 'price' | 'branch', string>> {
    const errors: Partial<Record<'category' | 'title' | 'description' | 'price' | 'branch', string>> = {};
    if (!this.selectedCategoryId()) {
      errors.category = 'กรุณาเลือกหมวดหมู่';
    }
    if (!this.title().trim()) {
      errors.title = 'กรุณากรอกชื่อบริการ';
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
