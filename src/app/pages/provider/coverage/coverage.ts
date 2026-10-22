import { Component, OnInit, signal } from '@angular/core';
import { ConfirmSheet } from '../../../shared/ui/confirm-sheet';
import { MapView } from '../../../demo/map-view';
import { DirtyFormGuardState, summarizeChanges } from '../../../shared/forms/dirty-form.guard';
import { UseDirtyGuard } from '../../../shared/forms/use-dirty-guard';
import { ToastService } from '../../../core/toast.service';
import { SkeletonCard } from '../../../shared/ui/skeleton-card';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  LocationPickerModal,
  LocationPickerValue,
} from '../../../demo/location-picker-modal';
import { PageShell } from '../../../demo/page-shell';
import { ProviderSetupBar } from '../../../shared/provider-setup-bar';
import { ProviderBottomNav } from '../../../shared/provider-bottom-nav';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { ProviderBranch, ProviderDetail } from '../../../core/models';
import { UserLocationService } from '../../../core/user-location.service';
import { scrollToFirstError } from '../../../shared/scroll-to-first-error';
import { GLOSSARY } from '../../../shared/glossary';

@Component({
  selector: 'app-coverage-page',
  imports: [
    PageShell,
    RouterLink,
    LocationPickerModal,
    ProviderSetupBar,
    ProviderBottomNav,
    ConfirmSheet,
    MapView,
    SkeletonCard,
  ],
  templateUrl: './coverage.html',
})
export class CoveragePage implements OnInit {
  protected readonly GLOSSARY = GLOSSARY;
  protected readonly provider = signal<ProviderDetail | null>(null);
  protected readonly branches = signal<ProviderBranch[]>([]);
  protected readonly saving = signal(false);
  protected readonly loading = signal(true);
  protected readonly toast = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly disableTarget = signal<ProviderBranch | null>(null);
  protected readonly deleteTarget = signal<ProviderBranch | null>(null);
  protected readonly disabling = signal(false);
  protected readonly deleting = signal(false);

  protected readonly pickerOpen = signal(false);
  /** null = สร้างจุดใหม่ */
  protected readonly editingBranchId = signal<string | null>(null);
  protected readonly editingName = signal('');
  protected readonly editingActive = signal(true);
  protected readonly editingRadiusKm = signal(5);
  protected readonly editingLat = signal(0);
  protected readonly editingLng = signal(0);
  protected readonly pickerTitle = signal<string>(GLOSSARY.coverageAreaTitle);
  protected readonly selectedBranchId = signal<string | null>(null);
  protected readonly saveConfirmOpen = signal(false);
  protected readonly saveConfirmMessage = signal('');
  protected readonly discardConfirmOpen = signal(false);
  private formSnapshot = '';
  private readonly formGuard: UseDirtyGuard;

  constructor(
    private readonly api: LocalGoApiService,
    private readonly userLocation: UserLocationService,
    private readonly dirty: DirtyFormGuardState,
    private readonly toastService: ToastService,
  ) {
    this.formGuard = new UseDirtyGuard(this.dirty);
  }

  async ngOnInit(): Promise<void> {
    await this.reload();
    if (!this.editingBranchId() && this.branches().length === 0) {
      await this.startNewBranch();
    }
  }

  protected isEditingExisting(): boolean {
    return !!this.editingBranchId();
  }

  protected selectBranch(branch: ProviderBranch): void {
    this.selectedBranchId.set(branch.id);
    this.formOpen.set(false);
  }

  protected selectedBranch(): ProviderBranch | null {
    const id = this.selectedBranchId();
    return id ? (this.branches().find((b) => b.id === id) ?? null) : null;
  }

  protected editBranch(branch: ProviderBranch): void {
    this.selectBranch(branch);
    this.loadBranchDraft(branch, true);
  }

  private loadBranchDraft(branch: ProviderBranch, openForm: boolean): void {
    this.editingBranchId.set(branch.id);
    this.editingName.set(branch.name);
    this.editingActive.set(branch.isActive);
    this.editingRadiusKm.set(Math.max(1, Math.round(branch.serviceRadiusMeters / 1000)));
    this.editingLat.set(branch.latitude);
    this.editingLng.set(branch.longitude);
    this.pickerTitle.set(branch.name);
    this.error.set(null);
    this.formOpen.set(openForm);
    this.captureFormBaseline();
  }

  private branchFormState(): {
    name: string;
    radius: number;
    active: boolean;
    lat: number;
    lng: number;
  } {
    return {
      name: this.editingName().trim(),
      radius: this.editingRadiusKm(),
      active: this.editingActive(),
      lat: this.editingLat(),
      lng: this.editingLng(),
    };
  }

  private captureFormBaseline(): void {
    const state = this.branchFormState();
    this.formGuard.captureBaseline(state);
    this.formSnapshot = JSON.stringify(state);
  }

  protected hasFormChanges(): boolean {
    return this.formGuard.hasChanges(this.branchFormState());
  }

  protected askSaveBranch(): void {
    if (!this.hasFormChanges()) {
      this.error.set('ไม่มีการเปลี่ยนแปลง');
      return;
    }
    const lines: string[] = [];
    const prev = JSON.parse(this.formSnapshot || '{}') as {
      name?: string;
      radius?: number;
      active?: boolean;
    };
    if (prev.name !== this.editingName().trim()) {
      lines.push(`ชื่อ: ${prev.name ?? '—'} → ${this.editingName().trim()}`);
    }
    if (prev.radius !== this.editingRadiusKm()) {
      lines.push(`รัศมี: ${prev.radius ?? '—'} → ${this.editingRadiusKm()} กม.`);
    }
    if (prev.active !== this.editingActive()) {
      lines.push(`สถานะ: ${prev.active ? 'เปิด' : 'ปิด'} → ${this.editingActive() ? 'เปิด' : 'ปิด'}`);
    }
    this.saveConfirmMessage.set(summarizeChanges(lines));
    this.saveConfirmOpen.set(true);
  }

  protected touchForm(): void {
    this.formGuard.syncDirty(this.branchFormState());
  }

  protected closeForm(): void {
    if (this.hasFormChanges()) {
      this.discardConfirmOpen.set(true);
      return;
    }
    this.formOpen.set(false);
    this.dirty.markPristine();
    this.dirty.unbindBeforeUnload();
  }

  protected confirmDiscardForm(): void {
    this.discardConfirmOpen.set(false);
    this.formOpen.set(false);
    this.dirty.markPristine();
    this.dirty.unbindBeforeUnload();
  }

  protected async startNewBranch(): Promise<void> {
    this.editingBranchId.set(null);
    this.editingName.set('');
    this.editingActive.set(true);
    this.editingRadiusKm.set(5);
    this.formOpen.set(true);
    const area = await this.userLocation.resolveSearchArea();
    this.editingLat.set(area.lat);
    this.editingLng.set(area.lng);
    this.pickerTitle.set(area.title);
    this.error.set(null);
    this.captureFormBaseline();
  }

  protected canContinueToServices(): boolean {
    return this.branches().some((b) => b.isActive);
  }

  protected async saveBranch(): Promise<void> {
    const p = this.provider();
    const name = this.editingName().trim();
    if (!p || !name || this.saving()) {
      this.error.set(GLOSSARY.branchNameRequired);
      scrollToFirstError();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const body = {
      name,
      latitude: this.editingLat(),
      longitude: this.editingLng(),
      serviceRadiusMeters: this.editingRadiusKm() * 1000,
      isActive: this.editingActive(),
    };
    try {
      const branchId = this.editingBranchId();
      if (branchId) {
        await firstValueFrom(this.api.updateBranch(p.id, branchId, body));
        this.toastService.show(GLOSSARY.coverageSavedToast(name, this.editingRadiusKm()));
      } else {
        await firstValueFrom(this.api.addBranch(p.id, body));
        this.toastService.show(GLOSSARY.coverageAddedToast(name, this.editingRadiusKm()));
      }
      this.formGuard.markSaved(this.branchFormState());
      this.formSnapshot = JSON.stringify(this.branchFormState());
      await this.reload();
      const list = this.branches();
      const saved = branchId ? list.find((b) => b.id === branchId) : list[list.length - 1];
      if (saved) {
        this.loadBranchDraft(saved, false);
      }
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
      scrollToFirstError();
    } finally {
      this.saving.set(false);
    }
  }

  protected askDeactivateBranch(branch: ProviderBranch): void {
    this.disableTarget.set(branch);
  }

  protected askDeleteBranch(branch: ProviderBranch): void {
    this.deleteTarget.set(branch);
  }

  protected async activateBranch(branch: ProviderBranch): Promise<void> {
    const p = this.provider();
    if (!p || this.disabling()) {
      return;
    }
    this.disabling.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.updateBranch(p.id, branch.id, {
          name: branch.name,
          latitude: branch.latitude,
          longitude: branch.longitude,
          serviceRadiusMeters: branch.serviceRadiusMeters,
          isActive: true,
        }),
      );
      this.showToast('บันทึกแล้ว');
      await this.reload();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'เปิดใช้งานไม่สำเร็จ');
    } finally {
      this.disabling.set(false);
    }
  }

  protected async confirmDeactivateBranch(): Promise<void> {
    const branch = this.disableTarget();
    const p = this.provider();
    if (!branch || !p || this.disabling()) {
      return;
    }
    this.disabling.set(true);
    try {
      await firstValueFrom(
        this.api.updateBranch(p.id, branch.id, {
          name: branch.name,
          latitude: branch.latitude,
          longitude: branch.longitude,
          serviceRadiusMeters: branch.serviceRadiusMeters,
          isActive: false,
        }),
      );
      this.showToast('บันทึกแล้ว');
      this.disableTarget.set(null);
      await this.reload();
    } finally {
      this.disabling.set(false);
    }
  }

  protected async confirmDeleteBranch(): Promise<void> {
    const branch = this.deleteTarget();
    const p = this.provider();
    if (!branch || !p || this.deleting()) {
      return;
    }
    this.deleting.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.deleteBranch(p.id, branch.id));
      this.showToast(GLOSSARY.coverageRemovedToast);
      this.deleteTarget.set(null);
      if (this.editingBranchId() === branch.id) {
        this.editingBranchId.set(null);
        this.formOpen.set(false);
      }
      await this.reload();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'ลบพื้นที่ให้บริการไม่สำเร็จ');
    } finally {
      this.deleting.set(false);
    }
  }

  protected toggleFormOpen(): void {
    this.formOpen.update((v) => !v);
  }

  protected openPicker(): void {
    this.pickerOpen.set(true);
  }

  protected closePicker(): void {
    this.pickerOpen.set(false);
  }

  protected applyLocation(value: LocationPickerValue): void {
    this.editingRadiusKm.set(value.radiusKm);
    this.editingLat.set(value.lat);
    this.editingLng.set(value.lng);
    this.editingName.set(value.title);
    this.pickerTitle.set(value.title);
    this.pickerOpen.set(false);
    this.touchForm();
  }

  private showToast(text: string): void {
    this.toast.set(text);
    window.setTimeout(() => {
      if (this.toast() === text) {
        this.toast.set(null);
      }
    }, 2800);
  }

  private async reload(): Promise<void> {
    this.loading.set(true);
    try {
      const mine = await firstValueFrom(this.api.getMyProvider());
      this.provider.set(mine);
      this.branches.set(mine.branches);
      const keepId = this.selectedBranchId();
      const selected = keepId ? mine.branches.find((b) => b.id === keepId) : mine.branches[0];
      if (selected) {
        this.selectedBranchId.set(selected.id);
      }
      if (mine.branches.length > 0) {
        this.formOpen.set(false);
      }
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 404) {
        this.provider.set(null);
        this.branches.set([]);
      } else {
        throw e;
      }
    } finally {
      this.loading.set(false);
    }
  }
}
