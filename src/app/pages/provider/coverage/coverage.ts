import { Component, OnInit, signal } from '@angular/core';
import { ConfirmSheet } from '../../../shared/ui/confirm-sheet';
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

@Component({
  selector: 'app-coverage-page',
  imports: [
    PageShell,
    RouterLink,
    LocationPickerModal,
    ProviderSetupBar,
    ProviderBottomNav,
    ConfirmSheet,
  ],
  templateUrl: './coverage.html',
})
export class CoveragePage implements OnInit {
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
  protected readonly pickerTitle = signal('จุดให้บริการ');

  constructor(
    private readonly api: LocalGoApiService,
    private readonly userLocation: UserLocationService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.reload();
    if (!this.editingBranchId() && this.branches().length === 0) {
      await this.startNewBranch();
    }
  }

  protected isEditingExisting(): boolean {
    return !!this.editingBranchId();
  }

  protected editBranch(branch: ProviderBranch): void {
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
  }

  protected async startNewBranch(): Promise<void> {
    this.editingBranchId.set(null);
    this.editingName.set('จุดให้บริการใหม่');
    this.editingActive.set(true);
    this.editingRadiusKm.set(5);
    this.formOpen.set(true);
    const area = await this.userLocation.resolveSearchArea();
    this.editingLat.set(area.lat);
    this.editingLng.set(area.lng);
    this.pickerTitle.set(area.title);
    this.error.set(null);
  }

  protected async saveBranch(): Promise<void> {
    const p = this.provider();
    const name = this.editingName().trim();
    if (!p || !name || this.saving()) {
      this.error.set('กรุณาระบุชื่อจุดให้บริการ');
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
        this.showToast('บันทึกแล้ว');
      } else {
        await firstValueFrom(this.api.addBranch(p.id, body));
        this.showToast('บันทึกแล้ว');
      }
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
      this.showToast('ลบจุดแล้ว');
      this.deleteTarget.set(null);
      if (this.editingBranchId() === branch.id) {
        this.editingBranchId.set(null);
        this.formOpen.set(false);
      }
      await this.reload();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'ลบจุดไม่สำเร็จ');
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
      if (mine.branches[0] && !this.editingBranchId()) {
        this.loadBranchDraft(mine.branches[0], false);
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
