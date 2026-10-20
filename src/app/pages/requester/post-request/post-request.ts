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
import { formatCoordinates } from '../../../shared/coordinates';
import { OPEN_BUDGET, REQUEST_DETAILS_MAX, REQUEST_TITLE_MAX, budgetAmountError } from '../../../shared/form-rules';
import { apiErrorMessage } from '../../../core/api-error.util';
import { focusFirstInvalid } from '../../../shared/focus-invalid';
import { FieldError } from '../../../shared/field-error';
import { environment } from '../../../../environments/environment';

type FieldKey = 'category' | 'title' | 'description' | 'location' | 'budget';

@Component({
  selector: 'app-post-request-page',
  imports: [PageShell, LocationPickerModal, RequesterBottomNav, RequesterFlowBar, FieldError],
  templateUrl: './post-request.html',
})
export class PostRequestPage implements OnInit {
  protected readonly pickerOpen = signal(false);
  protected readonly categories = signal<Category[]>([]);
  protected readonly categoriesError = signal<string | null>(null);
  protected readonly categoriesLoading = signal(true);
  protected readonly selectedCategoryId = signal<string | null>(null);
  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly budgetMode = signal<'open' | 'amount'>('open');
  protected readonly budgetAmount = signal('');
  protected readonly posting = signal(false);
  protected readonly locating = signal(false);
  protected readonly titleMax = REQUEST_TITLE_MAX;
  protected readonly detailsMax = REQUEST_DETAILS_MAX;
  protected readonly submitError = signal<string | null>(null);
  protected readonly fieldErrors = signal<Partial<Record<FieldKey, string>>>({});
  protected readonly requestLocation = signal({
    title: 'จุดรับงานปัจจุบัน',
    subtitle: 'พิกัดเริ่มต้นของประกาศนี้',
    radiusKm: 5,
    lat: environment.mapDefaultLat,
    lng: environment.mapDefaultLng,
  });
  protected readonly openBudgetLabel = OPEN_BUDGET;

  private readonly api = inject(LocalGoApiService);
  private readonly session = inject(SessionStateService);
  private readonly router = inject(Router);
  private readonly userLocation = inject(UserLocationService);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadCategories(), this.loadLocation()]);
  }

  protected coordinateText(): string {
    const loc = this.requestLocation();
    return formatCoordinates(loc.lat, loc.lng, this.locating());
  }

  protected async retryCategories(): Promise<void> {
    await this.loadCategories();
  }

  protected selectCategory(id: string): void {
    this.selectedCategoryId.set(id || null);
    this.clearField('category');
  }

  protected updateTitle(value: string): void {
    this.title.set(value.slice(0, REQUEST_TITLE_MAX));
    this.clearField('title');
  }

  protected updateDescription(value: string): void {
    this.description.set(value.slice(0, REQUEST_DETAILS_MAX));
    this.clearField('description');
  }

  protected setBudgetMode(mode: 'open' | 'amount'): void {
    this.budgetMode.set(mode);
    this.clearField('budget');
  }

  protected updateBudgetAmount(value: string): void {
    this.budgetAmount.set(value.replace(/\D/g, ''));
    this.budgetMode.set('amount');
    this.clearField('budget');
  }

  protected openPicker(): void {
    this.pickerOpen.set(true);
  }

  protected closePicker(): void {
    this.pickerOpen.set(false);
  }

  protected applyLocation(value: LocationPickerValue): void {
    const subtitle = value.subtitle
      .replace(/รัศมี\s*\d+(?:\.\d+)?\s*กม\.?/g, '')
      .replace(/^[\s·]+|[\s·]+$/g, '')
      .trim();
    const loc = {
      title: value.title,
      subtitle,
      radiusKm: value.radiusKm,
      lat: value.lat,
      lng: value.lng,
    };
    this.requestLocation.set(loc);
    this.locating.set(false);
    this.userLocation.remember(loc);
    this.pickerOpen.set(false);
    this.clearField('location');
  }

  protected pressPublish(event: Event): void {
    if (this.posting()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.posting.set(true);
    void this.publish();
  }

  protected async publish(): Promise<void> {
    const errors = this.validate();
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) {
      this.posting.set(false);
      setTimeout(() => focusFirstInvalid());
      return;
    }
    this.submitError.set(null);
    try {
      const loc = this.requestLocation();
      const created = await firstValueFrom(
        this.api.createRequest({
          categoryId: this.selectedCategoryId()!,
          title: this.title().trim(),
          description: this.description().trim() || undefined,
          addressText: loc.title,
          latitude: loc.lat,
          longitude: loc.lng,
          searchRadiusMeters: loc.radiusKm * 1000,
          budgetText: this.budgetPayload(),
          publish: true,
        }),
      );
      this.session.requesterRequestId = created.id;
      await this.router.navigate(['/requester/bids'], {
        queryParams: { posted: '1', requestId: created.id },
        replaceUrl: true,
      });
    } catch (e) {
      this.submitError.set(apiErrorMessage(e, 'ประกาศงานไม่สำเร็จ'));
      this.posting.set(false);
    }
  }

  private budgetPayload(): string {
    return this.budgetMode() === 'open' ? OPEN_BUDGET : this.budgetAmount().trim();
  }

  private validate(): Partial<Record<FieldKey, string>> {
    const errors: Partial<Record<FieldKey, string>> = {};
    if (!this.selectedCategoryId()) {
      errors.category = 'กรุณาเลือกหมวดหมู่';
    }
    if (!this.title().trim()) {
      errors.title = 'กรุณากรอกหัวข้องาน';
    } else if (this.title().trim().length > REQUEST_TITLE_MAX) {
      errors.title = `หัวข้องานต้องไม่เกิน ${REQUEST_TITLE_MAX} ตัวอักษร`;
    }
    if (!this.description().trim()) {
      errors.description = 'กรุณากรอกรายละเอียด';
    } else if (this.description().trim().length > REQUEST_DETAILS_MAX) {
      errors.description = `รายละเอียดต้องไม่เกิน ${REQUEST_DETAILS_MAX} ตัวอักษร`;
    }
    const loc = this.requestLocation();
    if (this.locating() || (loc.lat === 0 && loc.lng === 0)) {
      errors.location = 'กรุณาเลือกตำแหน่ง';
    }
    if (this.budgetMode() === 'amount') {
      const budgetError = budgetAmountError(this.budgetAmount());
      if (budgetError) {
        errors.budget = budgetError;
      }
    }
    return errors;
  }

  private clearField(key: FieldKey): void {
    const current = this.fieldErrors();
    if (!current[key]) {
      return;
    }
    const next = { ...current };
    delete next[key];
    this.fieldErrors.set(next);
  }

  private async loadCategories(): Promise<void> {
    this.categoriesLoading.set(true);
    this.categoriesError.set(null);
    try {
      const categories = await firstValueFrom(this.api.listCategories());
      this.categories.set(categories);
      if (categories.length === 0) {
        this.categoriesError.set('โหลดหมวดหมู่ไม่สำเร็จ');
        this.selectedCategoryId.set(null);
        return;
      }
      if (!categories.some((cat) => cat.id === this.selectedCategoryId())) {
        this.selectedCategoryId.set(null);
      }
    } catch {
      this.categories.set([]);
      this.selectedCategoryId.set(null);
      this.categoriesError.set('โหลดหมวดหมู่ไม่สำเร็จ');
    } finally {
      this.categoriesLoading.set(false);
    }
  }

  private async loadLocation(): Promise<void> {
    try {
      const area = await this.userLocation.resolveSearchArea();
      this.requestLocation.set({
        title: area.title,
        subtitle: area.subtitle,
        radiusKm: area.radiusKm,
        lat: area.lat,
        lng: area.lng,
      });
    } finally {
      this.locating.set(false);
    }
  }
}
