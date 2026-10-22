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
import { ConfirmSheet } from '../../../shared/ui/confirm-sheet';
import { ToastService } from '../../../core/toast.service';
import { ConfirmSaveDialog } from '../../../shared/forms/confirm-save-dialog';
import { DirtyFormGuardState } from '../../../shared/forms/dirty-form.guard';
import { UseDirtyGuard } from '../../../shared/forms/use-dirty-guard';
import { SkeletonCard } from '../../../shared/ui/skeleton-card';

@Component({
  selector: 'app-edit-service-page',
  imports: [
    PageShell,
    RouterLink,
    ProviderBottomNav,
    ConfirmSheet,
    ConfirmSaveDialog,
    SkeletonCard,
  ],
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
  protected readonly deleteOpen = signal(false);
  protected readonly deleting = signal(false);
  protected readonly saveConfirmOpen = signal(false);
  protected readonly saveConfirmMessage = signal('');
  protected readonly discardConfirmOpen = signal(false);

  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(LocalGoApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly dirty = inject(DirtyFormGuardState);
  private readonly formGuard = new UseDirtyGuard(this.dirty);
  private baselineSummary: ReturnType<typeof this.formSnapshot> | null = null;

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
      this.captureBaseline();
    }
  }

  private formSnapshot(): {
    categoryId: string | null;
    title: string;
    description: string;
    basePriceText: string;
    branchIds: string[];
  } {
    return {
      categoryId: this.selectedCategoryId(),
      title: this.title().trim(),
      description: this.description().trim(),
      basePriceText: this.basePriceText().trim(),
      branchIds: [...this.selectedBranchIds()].sort(),
    };
  }

  private captureBaseline(): void {
    const state = this.formSnapshot();
    this.formGuard.captureBaseline(state);
    this.baselineSummary = { ...state, branchIds: [...state.branchIds] };
  }

  protected touchForm(): void {
    this.formGuard.syncDirty(this.formSnapshot());
  }

  protected hasChanges(): boolean {
    return this.formGuard.hasChanges(this.formSnapshot());
  }

  protected selectCategory(id: string): void {
    this.selectedCategoryId.set(id);
    this.touchForm();
  }

  protected toggleBranch(branchId: string, checked: boolean): void {
    const next = new Set(this.selectedBranchIds());
    if (checked) {
      next.add(branchId);
    } else {
      next.delete(branchId);
    }
    this.selectedBranchIds.set(next);
    this.touchForm();
  }

  protected isBranchSelected(branchId: string): boolean {
    return this.selectedBranchIds().has(branchId);
  }

  protected askSave(): void {
    if (!this.hasChanges()) {
      return;
    }
    const prev = this.baselineSummary;
    const cur = this.formSnapshot();
    const lines: string[] = [];
    if (prev && prev.title !== cur.title) {
      lines.push(`ชื่อ: ${prev.title || '—'} → ${cur.title || '—'}`);
    }
    if (prev && prev.basePriceText !== cur.basePriceText) {
      lines.push(`ราคา: ${prev.basePriceText || '—'} → ${cur.basePriceText || '—'}`);
    }
    if (prev && JSON.stringify(prev.branchIds) !== JSON.stringify(cur.branchIds)) {
      lines.push('จุดให้บริการ: มีการเปลี่ยนแปลง');
    }
    this.saveConfirmMessage.set(this.formGuard.buildSaveMessage(lines));
    this.saveConfirmOpen.set(true);
  }

  protected confirmSaveDialog(): void {
    this.saveConfirmOpen.set(false);
    void this.save();
  }

  protected cancelSaveDialog(): void {
    this.saveConfirmOpen.set(false);
  }

  protected cancelDiscardDialog(): void {
    this.discardConfirmOpen.set(false);
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
    const serviceTitle = this.title().trim();
    try {
      const branchIds = [...this.selectedBranchIds()];
      await firstValueFrom(
        this.api.updateService(p.id, svc.id, {
          categoryId,
          title: serviceTitle,
          description: this.description().trim() || undefined,
          basePriceText: this.basePriceText().trim() || undefined,
          branchIds,
        }),
      );
      this.formGuard.markSaved(this.formSnapshot());
      this.toast.show(`บันทึกบริการ '${serviceTitle}' แล้ว`);
      await this.router.navigateByUrl('/provider/manage');
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'บันทึกไม่สำเร็จ'));
      scrollToFirstError();
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteService(): Promise<void> {
    const p = this.provider();
    const svc = this.service();
    if (!p || !svc || this.deleting()) {
      return;
    }
    this.deleting.set(true);
    try {
      await firstValueFrom(this.api.deleteService(p.id, svc.id));
      this.formGuard.markSaved(this.formSnapshot());
      this.toast.show('ลบบริการแล้ว');
      await this.router.navigateByUrl('/provider/manage');
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'ลบบริการไม่สำเร็จ'));
      scrollToFirstError();
    } finally {
      this.deleteOpen.set(false);
      this.deleting.set(false);
    }
  }
}
