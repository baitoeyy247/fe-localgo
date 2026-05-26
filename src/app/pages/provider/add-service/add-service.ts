import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { ProviderSetupBar } from '../../../shared/provider-setup-bar';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { Category, ProviderDetail } from '../../../core/models';

@Component({
  selector: 'app-add-service-page',
  imports: [PageShell, RouterLink, ProviderSetupBar, ProviderBottomNav],
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

  constructor(
    private readonly api: LocalGoApiService,
    private readonly router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    const cats = await firstValueFrom(this.api.listCategories());
    this.categories.set(cats);
    if (cats[0]) {
      this.selectedCategoryId.set(cats[0].id);
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

  protected async saveAndContinue(): Promise<void> {
    const p = this.provider();
    const categoryId = this.selectedCategoryId();
    if (!p || !categoryId || !this.title().trim() || this.saving()) {
      return;
    }
    this.saving.set(true);
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
}
