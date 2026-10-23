import { PRICE_ERROR, priceError } from '../../../shared/field-limits';
import { Component, OnInit, inject, signal, viewChild } from '@angular/core';
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
import { ThaiDatetimeField } from '../../../shared/ui/thai-datetime-field';
import { AuthService } from '../../../core/auth.service';
import { shouldShowLineNotificationHint } from '../../../shared/line-notification-hint';
import { OPEN_BUDGET_LABEL } from '../../../shared/budget.constants';
import { ToastService } from '../../../core/toast.service';
import { ConfirmSaveDialog } from '../../../shared/forms/confirm-save-dialog';
import { DirtyFormGuardState } from '../../../shared/forms/dirty-form.guard';
import { UseDirtyGuard } from '../../../shared/forms/use-dirty-guard';
import { GLOSSARY } from '../../../shared/glossary';
import { formatConfirmFieldLine, formatDatetimeConfirmLine } from '../../../shared/confirm-copy';
import { SkeletonCard } from '../../../shared/ui/skeleton-card';
import { ErrorState } from '../../../shared/ui/error-state';
import { RequestFlowCacheService } from '../../../core/request-flow-cache.service';
import { ServiceRequestDetail } from '../../../core/models';

@Component({
  selector: 'app-post-request-page',
  imports: [
    PageShell,
    LocationPickerModal,
    RequesterBottomNav,
    RequesterFlowBar,
    ThaiDatetimeField,
    ConfirmSaveDialog,
    SkeletonCard,
    ErrorState,
  ],
  templateUrl: './post-request.html',
})
export class PostRequestPage implements OnInit {
  /** L-16d: one date message only — the field's own (e.g. "วันที่ไม่ถูกต้อง"). */
  protected readonly dtField = viewChild(ThaiDatetimeField);
  protected readonly GLOSSARY = GLOSSARY;
  protected readonly pickerOpen = signal(false);
  protected readonly categories = signal<Category[]>([]);
  protected readonly selectedCategoryId = signal<string | null>(null);
  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly budgetMode = signal<'open' | 'fixed'>('open');
  protected readonly budgetAmount = signal('');
  protected readonly preferredAt = signal('');
  protected readonly posting = signal(false);
  protected readonly fieldErrors = signal<Record<string, string>>({});
  protected readonly error = signal<string | null>(null);
  protected readonly saveConfirmOpen = signal(false);
  protected readonly saveConfirmMessage = signal('');
  protected readonly discardConfirmOpen = signal(false);
  protected readonly loading = signal(true);
  /** A5-1: categories GET failed — form is hidden, error state + retry shown. */
  protected readonly loadError = signal<string | null>(null);
  protected readonly requestLocation = signal<{
    title: string;
    subtitle: string;
    radiusKm: number;
    lat: number;
    lng: number;
  }>({
    title: GLOSSARY.jobLocationCurrentTitle,
    subtitle: 'พิกัดเริ่มต้นของประกาศนี้',
    radiusKm: 5,
    lat: 0,
    lng: 0,
  });

  private readonly api = inject(LocalGoApiService);
  private readonly session = inject(SessionStateService);
  private readonly router = inject(Router);
  private readonly userLocation = inject(UserLocationService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly dirty = inject(DirtyFormGuardState);
  private readonly formGuard = new UseDirtyGuard(this.dirty);
  private readonly flowCache = inject(RequestFlowCacheService);
  private baselineSummary: ReturnType<typeof this.formSnapshot> | null = null;

  protected showLineHint(): boolean {
    return shouldShowLineNotificationHint(this.auth);
  }

  async ngOnInit(): Promise<void> {
    const area = await this.userLocation.resolveSearchArea();
    this.requestLocation.set({
      title: area.title,
      subtitle: area.subtitle,
      radiusKm: area.radiusKm,
      lat: area.lat,
      lng: area.lng,
    });
    if (area.needsPick) {
      this.pickerOpen.set(true);
    }

    await this.loadCategories();
  }

  protected async loadCategories(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const categories = await firstValueFrom(this.api.listCategories());
      this.categories.set(categories);
      if (categories[0] && !this.selectedCategoryId()) {
        this.selectedCategoryId.set(categories[0].id);
      }
      this.captureBaseline();
    } catch (e) {
      this.loadError.set(apiErrorMessage(e, 'โหลดข้อมูลไม่สำเร็จ'));
    } finally {
      this.loading.set(false);
    }
  }

  private formSnapshot(): {
    categoryId: string | null;
    title: string;
    description: string;
    budgetMode: 'open' | 'fixed';
    budgetAmount: string;
    preferredAt: string;
    location: { title: string; lat: number; lng: number; radiusKm: number };
  } {
    const loc = this.requestLocation();
    return {
      categoryId: this.selectedCategoryId(),
      title: this.title().trim(),
      description: this.description().trim(),
      budgetMode: this.budgetMode(),
      budgetAmount: this.budgetAmount().trim(),
      preferredAt: this.preferredAt().trim(),
      location: { title: loc.title, lat: loc.lat, lng: loc.lng, radiusKm: loc.radiusKm },
    };
  }

  private captureBaseline(): void {
    const state = this.formSnapshot();
    this.formGuard.captureBaseline(state);
    this.baselineSummary = JSON.parse(JSON.stringify(state)) as typeof state;
  }

  protected touchForm(): void {
    this.formGuard.syncDirty(this.formSnapshot());
  }

  protected hasChanges(): boolean {
    return this.formGuard.hasChanges(this.formSnapshot());
  }

  /** R45 T4-3: visible reason the submit button is disabled (null when enabled). */
  protected submitBlockedHint(): string | null {
    if (this.posting() || this.hasChanges()) {
      return null;
    }
    const missing: string[] = [];
    if (!this.selectedCategoryId()) missing.push('หมวดบริการ');
    if (!this.title().trim()) missing.push('ชื่องาน');
    return missing.length > 0
      ? `กรอก${missing.join(' และ ')}ก่อน จึงจะประกาศงานได้`
      : 'กรอกหรือแก้ไขรายละเอียดงานก่อน จึงจะประกาศงานได้';
  }

  protected selectCategory(id: string): void {
    this.selectedCategoryId.set(id);
    this.touchForm();
  }

  protected updateTitle(value: string): void {
    this.title.set(value);
    this.clearFieldError('title');
    this.touchForm();
  }

  protected updateDescription(value: string): void {
    this.description.set(value);
    this.touchForm();
  }

  protected setBudgetMode(mode: 'open' | 'fixed'): void {
    this.budgetMode.set(mode);
    this.clearFieldError('budget');
    this.touchForm();
  }

  protected updateBudgetAmount(value: string): void {
    // F-N1: never strip characters silently — validate with the shared bid price validator on blur
    this.budgetAmount.set(value);
    this.clearFieldError('budget');
    this.touchForm();
  }

  protected onPreferredAtChange(value: string): void {
    this.preferredAt.set(value);
    this.clearFieldError('preferredAt');
    this.touchForm();
  }

  protected showCoords(): boolean {
    const loc = this.requestLocation();
    return loc.title === 'พื้นที่ค้นหาเริ่มต้น' || loc.title === GLOSSARY.jobLocationCurrentTitle;
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
    this.touchForm();
  }

  protected askSave(): void {
    if (!this.hasChanges()) {
      return;
    }
    this.dtField()?.markTouched();
    const preErrors = this.validateLocal();
    if (Object.keys(preErrors).length > 0) {
      this.fieldErrors.set(preErrors);
      scrollToFirstError();
      return;
    }
    const prev = this.baselineSummary;
    const cur = this.formSnapshot();
    const lines: string[] = [];
    if (!prev || prev.title !== cur.title) {
      lines.push(formatConfirmFieldLine('หัวข้อ', prev?.title, cur.title));
    }
    if (prev && prev.preferredAt !== cur.preferredAt) {
      lines.push(formatDatetimeConfirmLine('วันและเวลา', prev.preferredAt, cur.preferredAt));
    }
    if (prev && prev.budgetMode !== cur.budgetMode) {
      lines.push('งบประมาณ: เปลี่ยนรูปแบบ');
    }
    if (prev && prev.budgetAmount !== cur.budgetAmount) {
      lines.push(`จำนวนเงิน: ${prev.budgetAmount || '—'} → ${cur.budgetAmount || '—'}`);
    }
    if (prev && JSON.stringify(prev.location) !== JSON.stringify(cur.location)) {
      lines.push(`ตำแหน่ง: ${prev.location.title} → ${cur.location.title}`);
    }
    this.saveConfirmMessage.set(this.formGuard.buildSaveMessage(lines));
    this.saveConfirmOpen.set(true);
  }

  protected confirmSaveDialog(): void {
    this.saveConfirmOpen.set(false);
    void this.publish();
  }

  protected cancelSaveDialog(): void {
    this.saveConfirmOpen.set(false);
  }

  protected cancelDiscardDialog(): void {
    this.discardConfirmOpen.set(false);
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
    const preferredIso = this.preferredAt().trim();
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
          preferredStartAt: new Date(preferredIso).toISOString(),
          budgetType: this.budgetMode() === 'open' ? 'open' : 'fixed',
          budgetText: this.resolveBudgetText(),
          publish: true,
        }),
      );
      this.formGuard.markSaved(this.formSnapshot());
      this.session.requesterRequestId = created.id;
      this.flowCache.putPrivateBids(created as ServiceRequestDetail, []);
      this.toast.show(`ประกาศงาน '${title}' แล้ว`);
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

  protected onBudgetBlur(): void {
    if (this.budgetMode() !== 'fixed') {
      return;
    }
    const err = priceError(this.budgetAmount());
    const next = { ...this.fieldErrors() };
    if (err) {
      next['budget'] = err;
    } else {
      delete next['budget'];
    }
    this.fieldErrors.set(next);
  }

  private validateLocal(): Record<string, string> {
    const errors: Record<string, string> = {};
    const trimmedTitle = this.title().trim();
    if (!trimmedTitle) {
      errors['title'] = 'กรุณาระบุหัวข้องาน';
    } else if (trimmedTitle.length > 100) {
      errors['title'] = 'หัวข้องานต้องไม่เกิน 100 ตัวอักษร';
    }
    const iso = this.preferredAt().trim();
    if (!iso) {
      errors['preferredAt'] = 'กรุณาเลือกวันที่และเวลาที่ต้องการ';
    } else if (new Date(iso).getTime() < Date.now() - 60_000) {
      errors['preferredAt'] = 'กรุณาเลือกวันและเวลาในอนาคต';
    }
    if (this.budgetMode() === 'fixed') {
      const err = this.budgetAmount().trim() ? priceError(this.budgetAmount()) : PRICE_ERROR;
      if (err) {
        errors['budget'] = err;
      }
    }
    return errors;
  }

  /** API contract: open → budgetType + canonical label; fixed → integer digits only. */
  private resolveBudgetText(): string {
    if (this.budgetMode() === 'open') {
      return OPEN_BUDGET_LABEL;
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

  protected clearFieldError(key: string): void {
    const next = { ...this.fieldErrors() };
    delete next[key];
    this.fieldErrors.set(next);
  }
}
