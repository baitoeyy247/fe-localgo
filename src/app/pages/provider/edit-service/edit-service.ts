import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { apiErrorMessage } from '../../../core/api-error.util';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { Category, ProviderDetail, ProviderService } from '../../../core/models';
import { scrollToFirstError } from '../../../shared/scroll-to-first-error';

@Component({
  selector: 'app-edit-service-page',
  imports: [PageShell, RouterLink, ProviderBottomNav],
  templateUrl: './edit-service.html',
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
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(LocalGoApiService);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    const serviceId = this.route.snapshot.paramMap.get('serviceId');
    if (!serviceId) {
      this.loading.set(false);
      return;
    }
    const cats = await firstValueFrom(this.api.listCategories());
    this.categories.set(cats);
    try {
      const mine = await firstValueFrom(this.api.getMyProvider());
      this.provider.set(mine);
      const svc = mine.services.find((s) => s.id === serviceId);
      if (!svc) {
        this.loading.set(false);
        return;
      }
      this.service.set(svc);
      this.selectedCategoryId.set(svc.categoryId);
      this.title.set(svc.title);
      this.description.set(svc.description ?? '');
      this.basePriceText.set(svc.basePriceText ?? '');
      const linked = svc.branchIds?.length
        ? new Set(svc.branchIds)
        : new Set(mine.branches.filter((b) => b.isActive).map((b) => b.id));
      this.selectedBranchIds.set(linked);
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

  protected async save(): Promise<void> {
    const p = this.provider();
    const svc = this.service();
    const categoryId = this.selectedCategoryId();
    if (!p || !svc || !categoryId || !this.title().trim() || this.saving()) {
      if (!this.title().trim()) {
        this.error.set('กรุณาระบุชื่อบริการ');
        scrollToFirstError();
      }
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      const branchIds = [...this.selectedBranchIds()];
      await firstValueFrom(
        this.api.updateService(p.id, svc.id, {
          categoryId,
          title: this.title().trim(),
          description: this.description().trim() || undefined,
          basePriceText: this.basePriceText().trim() || undefined,
          branchIds,
        }),
      );
      await this.router.navigateByUrl('/provider/manage');
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'บันทึกไม่สำเร็จ'));
      scrollToFirstError();
    } finally {
      this.saving.set(false);
    }
  }
}
