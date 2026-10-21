import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  LocationPickerModal,
  LocationPickerValue,
} from '../../../demo/location-picker-modal';
import { PageShell } from '../../../demo/page-shell';
import { RequesterBottomNav } from '../../../shared/requester-bottom-nav';
import { RequesterFlowBar } from '../../../shared/requester-flow-bar';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { Category } from '../../../core/models';
import { SessionStateService } from '../../../core/session-state.service';
import { UserLocationService } from '../../../core/user-location.service';
import { apiErrorMessage } from '../../../core/api-error.util';
import { scrollToFirstError } from '../../../shared/scroll-to-first-error';
import { toDatetimeLocal } from '../../../shared/datetime.util';

@Component({
  selector: 'app-post-request-page',
  imports: [PageShell, LocationPickerModal, RequesterBottomNav, RequesterFlowBar],
  templateUrl: './post-request.html',
})
export class PostRequestPage implements OnInit {
  protected readonly pickerOpen = signal(false);
  protected readonly categories = signal<Category[]>([]);
  protected readonly selectedCategoryId = signal<string | null>(null);
  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly budgetMode = signal<'open' | 'fixed'>('open');
  protected readonly budgetAmount = signal('');
  protected readonly preferredDate = signal('');
  protected readonly preferredTime = signal('');
  protected readonly posting = signal(false);
  protected readonly fieldErrors = signal<Record<string, string>>({});
  protected readonly error = signal<string | null>(null);
  protected readonly requestLocation = signal({
    title: 'จุดรับงานปัจจุบัน',
    subtitle: 'พิกัดเริ่มต้นของประกาศนี้',
    radiusKm: 5,
    lat: 0,
    lng: 0,
  });

  private readonly api = inject(LocalGoApiService);
  private readonly session = inject(SessionStateService);
  private readonly router = inject(Router);
  private readonly userLocation = inject(UserLocationService);

  async ngOnInit(): Promise<void> {
    const area = await this.userLocation.resolveSearchArea();
    this.requestLocation.set({
      title: area.title,
      subtitle: area.subtitle,
      radiusKm: area.radiusKm,
      lat: area.lat,
      lng: area.lng,
    });

    const categories = await firstValueFrom(this.api.listCategories());
    this.categories.set(categories);
    if (categories[0]) {
      this.selectedCategoryId.set(categories[0].id);
    }
  }

  protected selectCategory(id: string): void {
    this.selectedCategoryId.set(id);
  }

  protected updateTitle(value: string): void {
    this.title.set(value);
    this.clearFieldError('title');
  }

  protected updateDescription(value: string): void {
    this.description.set(value);
  }

  protected setBudgetMode(mode: 'open' | 'fixed'): void {
    this.budgetMode.set(mode);
    this.clearFieldError('budget');
  }

  protected updateBudgetAmount(value: string): void {
    this.budgetAmount.set(value.replace(/[^\d]/gu, ''));
    this.clearFieldError('budget');
  }

  protected updatePreferredDate(value: string): void {
    this.preferredDate.set(value);
    this.clearFieldError('preferredAt');
  }

  protected updatePreferredTime(value: string): void {
    this.preferredTime.set(value);
    this.clearFieldError('preferredAt');
  }

  protected preferredMinDate(): string {
    return toDatetimeLocal(new Date()).slice(0, 10);
  }

  protected showCoords(): boolean {
    const loc = this.requestLocation();
    return loc.title === 'พื้นที่ค้นหาเริ่มต้น' || loc.title === 'จุดรับงานปัจจุบัน';
  }

  protected openPicker(): void {
    this.pickerOpen.set(true);
  }

  protected closePicker(): void {
    this.pickerOpen.set(false);
  }

  protected applyLocation(value: LocationPickerValue): void {
    const loc = {
      title: value.title,
      subtitle: value.subtitle,
      radiusKm: value.radiusKm,
      lat: value.lat,
      lng: value.lng,
    };
    this.requestLocation.set(loc);
    this.userLocation.remember(loc);
    this.pickerOpen.set(false);
  }

  protected async publish(): Promise<void> {
    if (this.posting()) {
      return;
    }

    const errors = this.validateLocal();
    this.fieldErrors.set(errors);
    this.error.set(null);
    if (Object.keys(errors).length > 0) {
      scrollToFirstError();
      return;
    }

    const categoryId = this.selectedCategoryId();
    const title = this.title().trim();
    const preferredIso = this.resolvePreferredIso();
    if (!categoryId || !title || !preferredIso) {
      return;
    }

    this.posting.set(true);
    try {
      const loc = this.requestLocation();
      const created = await firstValueFrom(
        this.api.createRequest({
          categoryId,
          title,
          description: this.description().trim() || undefined,
          addressText: loc.title,
          latitude: loc.lat,
          longitude: loc.lng,
          searchRadiusMeters: loc.radiusKm * 1000,
          preferredStartAt: preferredIso,
          budgetText: this.resolveBudgetText(),
          publish: true,
        }),
      );
      this.session.requesterRequestId = created.id;
      await this.router.navigate(['/requester/bids'], {
        queryParams: { posted: '1', requestId: created.id },
      });
    } catch (e) {
      const message = apiErrorMessage(e, 'ประกาศงานไม่สำเร็จ');
      this.mapApiError(message);
      this.error.set(message);
      scrollToFirstError();
    } finally {
      this.posting.set(false);
    }
  }

  private validateLocal(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!this.title().trim()) {
      errors['title'] = 'กรุณาระบุหัวข้องาน';
    }
    if (!this.preferredDate() || !this.preferredTime()) {
      errors['preferredAt'] = 'กรุณาเลือกวันที่และเวลาที่ต้องการ';
    } else {
      const iso = this.resolvePreferredIso();
      if (!iso || new Date(iso).getTime() < Date.now() - 60_000) {
        errors['preferredAt'] = 'วันที่และเวลาที่ต้องการต้องไม่เป็นเวลาในอดีต';
      }
    }
    if (this.budgetMode() === 'fixed') {
      const amount = Number(this.budgetAmount().trim());
      if (!Number.isInteger(amount) || amount < 1 || amount > 1_000_000) {
        errors['budget'] = 'งบประมาณต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 1000000';
      }
    }
    return errors;
  }

  private resolvePreferredIso(): string | null {
    const date = this.preferredDate();
    const time = this.preferredTime();
    if (!date || !time) {
      return null;
    }
    const local = `${date}T${time}`;
    const d = new Date(local);
    if (Number.isNaN(d.getTime())) {
      return null;
    }
    return d.toISOString();
  }

  /** API contract: open → "เปิดรับราคา"; fixed → integer digits only. */
  private resolveBudgetText(): string {
    if (this.budgetMode() === 'open') {
      return 'เปิดรับราคา';
    }
    return this.budgetAmount().trim();
  }

  private mapApiError(message: string): void {
    const next = { ...this.fieldErrors() };
    if (/งบ|budget|ราคา/iu.test(message)) {
      next['budget'] = message;
    }
    if (/วัน|เวลา|preferred/iu.test(message)) {
      next['preferredAt'] = message;
    }
    if (/หัวข้อ|title/iu.test(message)) {
      next['title'] = message;
    }
    this.fieldErrors.set(next);
  }

  private clearFieldError(key: string): void {
    const next = { ...this.fieldErrors() };
    delete next[key];
    this.fieldErrors.set(next);
  }
}
