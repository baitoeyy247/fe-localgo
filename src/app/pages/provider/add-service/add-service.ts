import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { ProviderSetupBar } from '../../../shared/provider-setup-bar';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { Category, ProviderDetail } from '../../../core/models';
import { apiErrorMessage } from '../../../core/api-error.util';
import { scrollToFirstError } from '../../../shared/scroll-to-first-error';
import { SkeletonCard } from '../../../shared/ui/skeleton-card';
import { ToastService } from '../../../core/toast.service';
import { ConfirmSaveDialog } from '../../../shared/forms/confirm-save-dialog';
import { DirtyFormGuardState } from '../../../shared/forms/dirty-form.guard';
import { UseDirtyGuard } from '../../../shared/forms/use-dirty-guard';
import { GLOSSARY } from '../../../shared/glossary';
import { formatConfirmFieldLine } from '../../../shared/confirm-copy';

@Component({
  selector: 'app-add-service-page',
  imports: [
    PageShell,
    RouterLink,
    ProviderSetupBar,
    ProviderBottomNav,
    ConfirmSaveDialog,
    SkeletonCard,
  ],
  templateUrl: './add-service.html',
})
export class AddServicePage implements OnInit {
  protected readonly GLOSSARY = GLOSSARY;
  protected readonly provider = signal<ProviderDetail | null>(null);
  protected readonly categories = signal<Category[]>([]);
  protected readonly selectedCategoryId = signal<string | null>(null);
  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly basePriceText = signal('');
  protected readonly selectedBranchIds = signal<Set<string>>(new Set());
  protected readonly saving = signal(false);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly saveConfirmOpen = signal(false);
  protected readonly saveConfirmMessage = signal('');
  protected readonly discardConfirmOpen = signal(false);

  private readonly api = inject(LocalGoApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly dirty = inject(DirtyFormGuardState);
  private readonly formGuard = new UseDirtyGuard(this.dirty);
  private baselineSummary: ReturnType<typeof this.formSnapshot> | null = null;

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

  protected updateTitle(value: string): void {
    this.title.set(value);
    this.touchForm();
  }

  protected updateDescription(value: string): void {
    this.description.set(value);
    this.touchForm();
  }

  protected updateBasePrice(value: string): void {
    this.basePriceText.set(value);
    this.touchForm();
  }

  protected askSave(): void {
    if (!this.hasChanges()) {
      return;
    }
    const prev = this.baselineSummary;
    const cur = this.formSnapshot();
    const lines: string[] = [];
    if (!prev || prev.title !== cur.title) {
      lines.push(formatConfirmFieldLine('ชื่อบริการ', prev?.title, cur.title));
    }
    if (prev && prev.description !== cur.description) {
      lines.push('รายละเอียด: มีการแก้ไข');
    }
    if (!prev || prev.basePriceText !== cur.basePriceText) {
      lines.push(formatConfirmFieldLine('ราคาเริ่มต้น', prev?.basePriceText, cur.basePriceText));
    }
    if (prev && JSON.stringify(prev.branchIds) !== JSON.stringify(cur.branchIds)) {
      lines.push(`${GLOSSARY.serviceBranch}: มีการเปลี่ยนแปลง`);
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
    const p = this.provider();
    const categoryId = this.selectedCategoryId();
    if (!p || !categoryId || !this.title().trim() || this.saving()) {
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
      const service = await firstValueFrom(
        this.api.addService(p.id, {
          categoryId,
          title: serviceTitle,
          description: this.description().trim() || undefined,
          basePriceText: this.basePriceText().trim() || undefined,
          branchIds: branchIds.length ? branchIds : undefined,
        }),
      );
      if (branchIds.length) {
        await firstValueFrom(this.api.setServiceBranches(p.id, service.id, branchIds));
      }
      this.formGuard.markSaved(this.formSnapshot());
      this.toast.show(`เพิ่มบริการ '${serviceTitle}' แล้ว`);
      await this.router.navigateByUrl('/provider/manage');
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'บันทึกไม่สำเร็จ'));
      scrollToFirstError();
    } finally {
      this.saving.set(false);
    }
  }
}
