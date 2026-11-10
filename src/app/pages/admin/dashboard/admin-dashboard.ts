import { Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { ErrorState } from '../../../shared/ui/error-state';
import { SkeletonCard } from '../../../shared/ui/skeleton-card';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import {
  AdminDashboard,
  AdminNotificationRow,
  AdminUserRow,
  AppointmentDetail,
  ServiceRequestSummary,
} from '../../../core/models';
import { apiErrorMessage } from '../../../core/api-error.util';
import {
  appointmentStatusLabel,
  displayRequestStatusLabel,
  requestStatusLabel,
} from '../../../shared/status-labels';
import { displayInitial } from '../../../shared/display-initial';
import { AuthService } from '../../../core/auth.service';
import { ConfirmSheet } from '../../../shared/ui/confirm-sheet';
import {
  adminNotificationEventLabel,
  adminNotificationLine,
  adminNotificationStatusLabel,
  adminAccountRoleLabel,
  adminSystemRoleLabel,
  adminUserStatusLabel,
} from '../../../shared/admin-labels';
import { formatScheduledAt } from '../../../shared/datetime.util';
import { ToastService } from '../../../core/toast.service';
import { MarketplaceCacheService } from '../../../core/marketplace-cache.service';
import { suspendUserConfirmMessage, suspendUserAriaLabel } from '../../../shared/confirm-copy';
import { GLOSSARY } from '../../../shared/glossary';
import { environment } from '../../../../environments/environment';
import { ADMIN_RESET_TOAST, adminToolErrorMessage, normalizeResetDashboard } from './admin-reset.util';

/** A-3: each dashboard section loads independently so one slow/failed call never blanks the page. */
export type AdminSection = 'dashboard' | 'users' | 'notifications' | 'requests' | 'appointments';
export const ADMIN_SECTIONS: readonly AdminSection[] = ['dashboard', 'users', 'notifications', 'requests', 'appointments'];
/** A-3: dashboard shows the latest 20 notification rows; the full log is paged on the BE. */
export const ADMIN_NOTIFICATIONS_PAGE_SIZE = 20;

@Component({
  selector: 'app-admin-dashboard-page',
  imports: [PageShell, ErrorState, SkeletonCard, ConfirmSheet],
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboardPage implements OnInit {
  protected readonly GLOSSARY = GLOSSARY;
  protected readonly dashboard = signal<AdminDashboard | null>(null);
  protected readonly users = signal<AdminUserRow[]>([]);
  protected readonly usersTotal = signal(0);
  protected readonly usersPage = signal(1);
  protected readonly pageSize = 20;
  protected readonly notifications = signal<AdminNotificationRow[]>([]);
  protected readonly requests = signal<ServiceRequestSummary[]>([]);
  protected readonly appointments = signal<AppointmentDetail[]>([]);
  protected readonly requestStatusFilter = signal('');
  protected readonly appointmentStatusFilter = signal('');
  protected readonly loading = signal(true);
  protected readonly listsLoading = signal(true);
  protected readonly acting = signal(false);
  protected readonly resetting = signal(false);
  protected readonly repairing = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly suspendConfirmOpen = signal(false);
  protected readonly suspendTarget = signal<AdminUserRow | null>(null);
  protected readonly activateConfirmOpen = signal(false);
  protected readonly activateTarget = signal<AdminUserRow | null>(null);
  protected readonly resetConfirmOpen = signal(false);
  protected readonly repairConfirmOpen = signal(false);
  /** A-3: per-section error copy (missing key = section loaded fine). */
  protected readonly sectionErrors = signal<Partial<Record<AdminSection, string>>>({});
  protected readonly sectionLoading = signal<Partial<Record<AdminSection, boolean>>>({});
  /** A-2: test-data tools and "บัญชีทดสอบ" badges only exist when the build enables test mode. */
  protected readonly showTestTools = signal(environment.allowDevLogin === true);
  protected readonly requestStatusLabel = requestStatusLabel;
  protected readonly appointmentStatusLabel = appointmentStatusLabel;
  protected readonly displayInitial = displayInitial;
  protected readonly adminAccountRoleLabel = adminAccountRoleLabel;
  protected readonly adminSystemRoleLabel = adminSystemRoleLabel;
  protected readonly adminUserStatusLabel = adminUserStatusLabel;

  private readonly api = inject(LocalGoApiService);
  private readonly toast = inject(ToastService);
  private readonly marketplaceCache = inject(MarketplaceCacheService);
  protected readonly auth = inject(AuthService);

  ngOnInit(): void {
    void this.load(true);
  }

  protected async load(initial = false): Promise<void> {
    // A-1: a retry with nothing loaded yet must show the skeleton, never an empty page with fake KPIs.
    if (initial || !this.dashboard()) {
      this.loading.set(true);
    }
    this.listsLoading.set(true);
    this.error.set(null);
    try {
      const failed = await this.fetchAllAdminData();
      if (failed.length === ADMIN_SECTIONS.length) {
        // Nothing loaded at all → full-page error with retry.
        this.error.set(this.sectionErrors().dashboard ?? 'โหลดหลังบ้านไม่สำเร็จ');
      }
    } finally {
      this.loading.set(false);
      this.listsLoading.set(false);
    }
  }

  /** Refresh KPI + lists after reset/repair without hiding the whole page. */
  private async refreshAfterMutation(): Promise<void> {
    this.listsLoading.set(true);
    try {
      await this.fetchAllAdminData();
    } finally {
      this.listsLoading.set(false);
    }
  }

  /** A-3: independent loads (allSettled). Returns the sections that failed. */
  private async fetchAllAdminData(): Promise<AdminSection[]> {
    const results = await Promise.allSettled(ADMIN_SECTIONS.map((s) => this.loadSection(s)));
    return ADMIN_SECTIONS.filter((_, i) => results[i].status === 'rejected');
  }

  private async loadSection(section: AdminSection): Promise<void> {
    this.sectionLoading.update((m) => ({ ...m, [section]: true }));
    try {
      switch (section) {
        case 'dashboard':
          this.dashboard.set(await firstValueFrom(this.api.getAdminDashboard(true)));
          break;
        case 'users': {
          const page = await firstValueFrom(this.api.listAdminUsers(this.usersPage(), this.pageSize));
          this.users.set(page.items);
          this.usersTotal.set(page.total);
          break;
        }
        case 'notifications':
          this.notifications.set(
            await firstValueFrom(this.api.listAdminNotifications(1, ADMIN_NOTIFICATIONS_PAGE_SIZE)),
          );
          break;
        case 'requests':
          this.requests.set(
            await firstValueFrom(this.api.listAdminServiceRequests(this.requestStatusFilter() || undefined)),
          );
          break;
        case 'appointments':
          this.appointments.set(
            await firstValueFrom(this.api.listAdminAppointments(this.appointmentStatusFilter() || undefined)),
          );
          break;
      }
      this.sectionErrors.update((m) => {
        const next = { ...m };
        delete next[section];
        return next;
      });
    } catch (e) {
      this.sectionErrors.update((m) => ({ ...m, [section]: apiErrorMessage(e, 'โหลดส่วนนี้ไม่สำเร็จ') }));
      throw e;
    } finally {
      this.sectionLoading.update((m) => ({ ...m, [section]: false }));
    }
  }

  protected sectionError(section: AdminSection): string | null {
    return this.sectionErrors()[section] ?? null;
  }

  protected isSectionLoading(section: AdminSection): boolean {
    return !!this.sectionLoading()[section] || (this.listsLoading() && !this.sectionError(section));
  }

  protected async retrySection(section: AdminSection): Promise<void> {
    if (this.sectionLoading()[section]) {
      return;
    }
    await this.loadSection(section).catch(() => undefined);
  }

  /** A-1: reset/repair/suspend stay disabled until real dashboard data is on screen. */
  protected adminActionsDisabled(): boolean {
    return (
      this.loading() ||
      this.listsLoading() ||
      !this.dashboard() ||
      this.acting() ||
      this.resetting() ||
      this.repairing()
    );
  }

  protected totalPages(): number {
    return Math.max(1, Math.ceil(this.usersTotal() / this.pageSize));
  }

  protected async goUsersPage(delta: number): Promise<void> {
    const next = Math.min(this.totalPages(), Math.max(1, this.usersPage() + delta));
    if (next === this.usersPage()) {
      return;
    }
    this.usersPage.set(next);
    await this.retrySection('users');
  }

  protected async setRequestFilter(status: string): Promise<void> {
    this.requestStatusFilter.set(status);
    await this.retrySection('requests');
  }

  protected async setAppointmentFilter(status: string): Promise<void> {
    this.appointmentStatusFilter.set(status);
    await this.retrySection('appointments');
  }

  protected canToggleUserStatus(u: AdminUserRow): boolean {
    const me = this.auth.user();
    return !!u.id && (!me?.id || me.id !== u.id);
  }

  protected suspendConfirmMessage(): string {
    const u = this.suspendTarget();
    if (!u) {
      return '';
    }
    const name = u.displayName?.trim() || u.lineUserId?.trim() || 'ผู้ใช้';
    return suspendUserConfirmMessage(name);
  }

  protected suspendButtonAriaLabel(u: AdminUserRow): string {
    const name = u.displayName?.trim() || u.lineUserId?.trim() || 'ผู้ใช้';
    return suspendUserAriaLabel(name);
  }

  protected requestToggleUser(u: AdminUserRow): void {
    if (!this.canToggleUserStatus(u) || this.adminActionsDisabled()) {
      return;
    }
    const currentStatus = this.userStatus(u);
    if (currentStatus !== 'Suspended') {
      this.suspendTarget.set(u);
      this.suspendConfirmOpen.set(true);
      return;
    }
    this.activateTarget.set(u);
    this.activateConfirmOpen.set(true);
  }

  protected async confirmActivateUser(): Promise<void> {
    const u = this.activateTarget();
    if (!u) {
      return;
    }
    this.activateConfirmOpen.set(false);
    await this.toggleUser(u);
    this.activateTarget.set(null);
  }

  protected async confirmSuspendUser(): Promise<void> {
    const u = this.suspendTarget();
    if (!u) {
      return;
    }
    this.suspendConfirmOpen.set(false);
    await this.toggleUser(u);
    this.suspendTarget.set(null);
  }

  protected async toggleUser(u: AdminUserRow): Promise<void> {
    if (!this.canToggleUserStatus(u) || this.acting()) {
      return;
    }
    const userId = u.id;
    if (!userId) {
      return;
    }
    const currentStatus = this.userStatus(u);
    const target = currentStatus === 'Suspended' ? 'Active' : 'Suspended';
    this.acting.set(true);
    try {
      await firstValueFrom(this.api.setAdminUserStatus(userId, target));
      this.users.update((rows) =>
        rows.map((row) => (row.id === userId ? { ...row, status: target } : row)),
      );
      const label = u.displayName?.trim() || 'ผู้ใช้';
      if (target === 'Suspended') {
        this.toast.show(`ระงับบัญชี ${label} แล้ว`);
        this.notice.set('ระงับผู้ใช้แล้ว');
      } else {
        this.toast.show(`เปิดใช้งานบัญชี ${label} แล้ว`);
        this.notice.set('เปิดใช้งานผู้ใช้แล้ว');
      }
      void this.refreshAfterMutation();
    } catch (e) {
      this.actionError.set(apiErrorMessage(e, 'อัปเดตสถานะผู้ใช้ไม่สำเร็จ'));
    } finally {
      this.acting.set(false);
    }
  }

  protected askResetTestData(): void {
    if (!this.showTestTools() || this.adminActionsDisabled()) {
      return;
    }
    this.resetConfirmOpen.set(true);
  }

  protected async resetTestData(): Promise<void> {
    if (!this.showTestTools() || this.resetting() || this.repairing() || !this.dashboard()) {
      return;
    }
    this.resetConfirmOpen.set(false);
    this.resetting.set(true);
    this.actionError.set(null);
    this.notice.set(null);
    // A-1: no optimistic clearing and no toast before the BE confirms.
    try {
      const result = (await firstValueFrom(this.api.resetTestData())) as {
        keptUsers?: number;
        deletedRequests?: number;
        sampleReviewsSeeded?: number;
        dashboard?: unknown;
      };
      this.marketplaceCache.invalidateAll();
      this.usersPage.set(1);
      const dashFromApi = normalizeResetDashboard(result.dashboard);
      if (dashFromApi) {
        this.dashboard.set(dashFromApi);
      }
      await this.refreshAfterMutation();
      const parts = [`ลบงาน ${result.deletedRequests ?? 0} รายการ`];
      if (typeof result.keptUsers === 'number') {
        parts.push(`คงบัญชีทดสอบ ${result.keptUsers} บัญชี`);
      }
      if (typeof result.sampleReviewsSeeded === 'number') {
        parts.push(`สร้างรีวิวตัวอย่าง ${result.sampleReviewsSeeded} รายการ`);
      }
      this.notice.set(`รีเซ็ตสำเร็จ — ${parts.join(' · ')}`);
      this.toast.show(ADMIN_RESET_TOAST, 4000);
    } catch (e) {
      this.notice.set(null);
      this.actionError.set(adminToolErrorMessage(e, 'รีเซ็ตข้อมูลทดสอบไม่สำเร็จ'));
    } finally {
      this.resetting.set(false);
    }
  }

  protected askRepairTestData(): void {
    if (!this.showTestTools() || this.adminActionsDisabled()) {
      return;
    }
    this.repairConfirmOpen.set(true);
  }

  protected async repairTestData(): Promise<void> {
    if (!this.showTestTools() || this.resetting() || this.repairing() || !this.dashboard()) {
      return;
    }
    this.repairConfirmOpen.set(false);
    this.repairing.set(true);
    this.actionError.set(null);
    this.notice.set(null);
    try {
      const result = await firstValueFrom(this.api.repairTestData());
      const moved = result.reviewReassigned ? 'ย้ายรีวิวแล้ว' : 'รีวิวตรงอยู่แล้วหรือไม่พบ';
      await this.refreshAfterMutation();
      this.notice.set(
        `ซ่อมข้อมูลทดสอบสำเร็จ: ${moved} · ลบงานเก่า ${result.staleRequestsRemoved ?? 0} รายการ`,
      );
    } catch (e) {
      this.notice.set(null);
      this.actionError.set(adminToolErrorMessage(e, 'ซ่อมข้อมูลทดสอบไม่สำเร็จ'));
    } finally {
      this.repairing.set(false);
    }
  }

  protected adminRequestStatusLabel(r: ServiceRequestSummary): string {
    const apptStatus = r.appointmentStatus ?? this.appointments().find((a) => a.serviceRequestId === r.id)?.status;
    return displayRequestStatusLabel(r.status, apptStatus ?? null);
  }

  protected userLine(u: AdminUserRow): string {
    const name = u.displayName ?? u.lineUserId ?? 'ผู้ใช้';
    const role = adminAccountRoleLabel(u);
    const status = adminUserStatusLabel(this.userStatus(u));
    return `${name} · ${role} · ${status}`;
  }

  protected isTestUser(u: AdminUserRow): boolean {
    return this.showTestTools() && !!u.lineUserId?.startsWith('dev-persona-');
  }

  protected notificationLabel(row: AdminNotificationRow): string {
    const type = String(row.eventType ?? row.type ?? '');
    const status = String(row.status ?? '');
    return adminNotificationLine(type, status, row.createdAt);
  }

  protected notificationEventLabel(row: AdminNotificationRow): string {
    return adminNotificationEventLabel(String(row.eventType ?? row.type ?? ''));
  }

  protected notificationDeliveryLabel(row: AdminNotificationRow): string {
    return adminNotificationStatusLabel(String(row.status ?? ''));
  }

  protected formatNotificationWhen(row: AdminNotificationRow): string {
    if (!row.createdAt) {
      return '—';
    }
    return new Date(row.createdAt).toLocaleString('th-TH', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  protected userStatus(u: AdminUserRow): string {
    return (u as { status?: string }).status ?? 'Active';
  }

  protected formatWhen(iso?: string | null): string {
    return formatScheduledAt(iso);
  }
}
