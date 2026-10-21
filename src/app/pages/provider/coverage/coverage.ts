import { Component, OnInit, signal } from '@angular/core';
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
import { LoadingSkeleton } from '../../../shared/loading-skeleton';
import { ConfirmModal } from '../../../shared/confirm-modal';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-coverage-page',
  imports: [PageShell, RouterLink, LocationPickerModal, ProviderSetupBar, ProviderBottomNav, LoadingSkeleton, ConfirmModal],
  templateUrl: './coverage.html',
})
export class CoveragePage implements OnInit {
  protected readonly provider = signal<ProviderDetail | null>(null);
  protected readonly branches = signal<ProviderBranch[]>([]);
  protected readonly saving = signal(false);
  protected readonly loading = signal(true);
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly deactivateTarget = signal<ProviderBranch | null>(null);
  protected readonly deleteTarget = signal<ProviderBranch | null>(null);
  protected readonly formOpen = signal(false);

  protected readonly pickerOpen = signal(false);
  /** null = สร้างจุดใหม่ */
  protected readonly editingBranchId = signal<string | null>(null);
  protected readonly editingName = signal('');
  protected readonly editingActive = signal(true);
  protected readonly editingRadiusKm = signal(5);
  protected readonly editingLat = signal(environment.mapDefaultLat);
  protected readonly editingLng = signal(environment.mapDefaultLng);
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
    this.editingBranchId.set(branch.id);
    this.editingName.set(branch.name);
    this.editingActive.set(branch.isActive);
    this.editingRadiusKm.set(Math.max(1, Math.round(branch.serviceRadiusMeters / 1000)));
    this.editingLat.set(branch.latitude);
    this.editingLng.set(branch.longitude);
    this.pickerTitle.set(branch.name);
    this.message.set(null);
    this.error.set(null);
    this.formOpen.set(true);
  }

  protected async startNewBranch(): Promise<void> {
    this.editingBranchId.set(null);
    this.editingActive.set(true);
    this.editingRadiusKm.set(5);
    this.editingLat.set(environment.mapDefaultLat);
    this.editingLng.set(environment.mapDefaultLng);
    this.editingName.set('พื้นที่ของฉัน');
    this.pickerTitle.set('พื้นที่ของฉัน');
    this.formOpen.set(true);
    this.message.set(null);
    this.error.set(null);
    const area = await this.userLocation.resolveSearchArea();
    if (this.editingBranchId()) {
      return;
    }
    this.editingLat.set(area.lat);
    this.editingLng.set(area.lng);
    const district = area.title?.trim();
    if (district && district !== 'พื้นที่ค้นหาเริ่มต้น' && district !== 'จุดให้บริการใหม่') {
      this.editingName.set(district);
      this.pickerTitle.set(district);
    }
  }

  protected beginSave(event: Event): void {
    if (this.saving()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.saving.set(true);
    void this.saveBranch();
  }

  protected async saveBranch(): Promise<void> {
    const p = this.provider();
    const name = this.editingName().trim();
    if (!p || !name) {
      this.error.set('กรุณาระบุชื่อจุดให้บริการ');
      this.saving.set(false);
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
        this.message.set('อัปเดตจุดให้บริการแล้ว');
      } else {
        await firstValueFrom(this.api.addBranch(p.id, body));
        this.message.set('เพิ่มจุดให้บริการแล้ว');
      }
      this.formOpen.set(false);
      await this.reload();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
    } finally {
      this.saving.set(false);
    }
  }

  protected async deactivateBranch(branch: ProviderBranch): Promise<void> {
    const p = this.provider();
    if (!p || this.saving()) {
      return;
    }
    this.deactivateTarget.set(branch);
  }

  protected dismissDeactivate(): void {
    if (!this.saving()) {
      this.deactivateTarget.set(null);
    }
  }

  protected async confirmDeactivate(): Promise<void> {
    const branch = this.deactivateTarget();
    const p = this.provider();
    if (!branch || !p || this.saving()) {
      return;
    }
    this.saving.set(true);
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
      this.deactivateTarget.set(null);
      this.message.set('ปิดจุดให้บริการแล้ว');
      await this.reload();
    } finally {
      this.saving.set(false);
    }
  }

  protected async enableBranch(branch: ProviderBranch): Promise<void> {
    const profile = this.provider();
    if (!profile || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.updateBranch(profile.id, branch.id, {
          name: branch.name,
          addressText: branch.addressText ?? undefined,
          latitude: branch.latitude,
          longitude: branch.longitude,
          serviceRadiusMeters: branch.serviceRadiusMeters,
          isActive: true,
        }),
      );
      this.message.set('เปิดจุดให้บริการแล้ว');
      await this.reload();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'เปิดจุดให้บริการไม่สำเร็จ');
    } finally {
      this.saving.set(false);
    }
  }

  protected askDelete(branch: ProviderBranch): void {
    if (!this.saving()) {
      this.deleteTarget.set(branch);
    }
  }

  protected dismissDelete(): void {
    if (!this.saving()) {
      this.deleteTarget.set(null);
    }
  }

  protected deleteMessage(): string {
    const branch = this.deleteTarget();
    return branch ? `ลบจุด "${branch.name}" ออกจากพื้นที่ให้บริการ` : '';
  }

  protected async confirmDelete(): Promise<void> {
    const branch = this.deleteTarget();
    const profile = this.provider();
    if (!branch || !profile || this.saving()) {
      return;
    }
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.deleteBranch(profile.id, branch.id));
      this.deleteTarget.set(null);
      this.formOpen.set(false);
      this.message.set('ลบจุดให้บริการแล้ว');
      await this.reload();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'ลบจุดให้บริการไม่สำเร็จ');
    } finally {
      this.saving.set(false);
    }
  }

  protected closeForm(): void {
    this.formOpen.set(false);
  }

  protected deactivateMessage(): string {
    const branch = this.deactivateTarget();
    return branch
      ? `ปิดใช้งานพื้นที่ "${branch.name}" แล้วงานใหม่ในรัศมีนี้จะไม่เข้ามา`
      : '';
  }

  protected setupComplete(): boolean {
    const profile = this.provider();
    return !!profile && profile.branches.length > 0 && profile.services.length > 0;
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

  private async reload(): Promise<void> {
    this.loading.set(true);
    try {
      const mine = await firstValueFrom(this.api.getMyProvider());
      this.provider.set(mine);
      this.branches.set(mine.branches);
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
