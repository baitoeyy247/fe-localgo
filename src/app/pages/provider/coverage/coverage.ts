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

@Component({
  selector: 'app-coverage-page',
  imports: [PageShell, RouterLink, LocationPickerModal, ProviderSetupBar, ProviderBottomNav],
  templateUrl: './coverage.html',
})
export class CoveragePage implements OnInit {
  protected readonly provider = signal<ProviderDetail | null>(null);
  protected readonly branches = signal<ProviderBranch[]>([]);
  protected readonly saving = signal(false);
  protected readonly loading = signal(true);
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

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
    this.editingBranchId.set(branch.id);
    this.editingName.set(branch.name);
    this.editingActive.set(branch.isActive);
    this.editingRadiusKm.set(Math.max(1, Math.round(branch.serviceRadiusMeters / 1000)));
    this.editingLat.set(branch.latitude);
    this.editingLng.set(branch.longitude);
    this.pickerTitle.set(branch.name);
    this.message.set(null);
    this.error.set(null);
  }

  protected async startNewBranch(): Promise<void> {
    this.editingBranchId.set(null);
    this.editingName.set('จุดให้บริการใหม่');
    this.editingActive.set(true);
    this.editingRadiusKm.set(5);
    this.message.set('กำลังตั้งจุดใหม่');
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
      await this.reload();
      const list = this.branches();
      const saved = branchId ? list.find((b) => b.id === branchId) : list[list.length - 1];
      if (saved) {
        this.editBranch(saved);
      }
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
    if (!confirm(`ปิดใช้งานจุด "${branch.name}"?`)) {
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
      this.message.set('ปิดจุดให้บริการแล้ว');
      await this.reload();
    } finally {
      this.saving.set(false);
    }
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
      if (mine.branches[0] && !this.editingBranchId()) {
        this.editBranch(mine.branches[0]);
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
