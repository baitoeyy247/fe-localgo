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
  adminNotificationLine,
  adminSystemRoleLabel,
  adminUserStatusLabel,
} from '../../../shared/admin-labels';
import { formatScheduledAt } from '../../../shared/datetime.util';

@Component({
  selector: 'app-admin-dashboard-page',
  imports: [PageShell, ErrorState, SkeletonCard, ConfirmSheet],
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboardPage implements OnInit {
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
  protected readonly requestStatusLabel = requestStatusLabel;
  protected readonly appointmentStatusLabel = appointmentStatusLabel;
  protected readonly displayInitial = displayInitial;

  private readonly api = inject(LocalGoApiService);
  protected readonly auth = inject(AuthService);

  ngOnInit(): void {
    void this.load(true);
  }

  protected async load(initial = false): Promise<void> {
    if (initial) {
      this.loading.set(true);
    }
    this.listsLoading.set(true);
    this.error.set(null);
    try {
      await this.fetchAllAdminData();
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'โหลดหลังบ้านไม่สำเร็จ'));
    } finally {
      this.loading.set(false);
      this.listsLoading.set(false);
    }
  }

  /** Refresh KPI + lists after reset/repair without hiding the whole page. */
  private async refreshAfterMutation(): Promise<void> {
    this.listsLoading.set(true);
    this.requests.set([]);
    this.appointments.set([]);
    this.notifications.set([]);
    try {
      await this.fetchAllAdminData();
    } catch (e) {
      this.actionError.set(apiErrorMessage(e, 'โหลดข้อมูลหลังรีเซ็ตไม่สำเร็จ'));
    } finally {
      this.listsLoading.set(false);
    }
  }

  private async fetchAllAdminData(): Promise<void> {
    const [dashboard, usersPage, notifications, requests, appointments] = await Promise.all([
      firstValueFrom(this.api.getAdminDashboard()),
      firstValueFrom(this.api.listAdminUsers(this.usersPage(), this.pageSize)),
      firstValueFrom(this.api.listAdminNotifications()),
      firstValueFrom(this.api.listAdminServiceRequests(this.requestStatusFilter() || undefined)),
      firstValueFrom(this.api.listAdminAppointments(this.appointmentStatusFilter() || undefined)),
    ]);
    this.dashboard.set(dashboard);
    this.users.set(usersPage.items);
    this.usersTotal.set(usersPage.total);
    this.notifications.set(notifications);
    this.requests.set(requests);
    this.appointments.set(appointments);
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
    const page = await firstValueFrom(this.api.listAdminUsers(next, this.pageSize));
    this.users.set(page.items);
    this.usersTotal.set(page.total);
  }

  protected async setRequestFilter(status: string): Promise<void> {
    this.requestStatusFilter.set(status);
    this.requests.set(
      await firstValueFrom(this.api.listAdminServiceRequests(status || undefined)),
    );
  }

  protected async setAppointmentFilter(status: string): Promise<void> {
    this.appointmentStatusFilter.set(status);
    this.appointments.set(
      await firstValueFrom(this.api.listAdminAppointments(status || undefined)),
    );
  }

  protected canToggleUserStatus(u: AdminUserRow): boolean {
    const me = this.auth.user();
    return !!u.id && (!me?.id || me.id !== u.id);
  }

  protected requestToggleUser(u: AdminUserRow): void {
    if (!this.canToggleUserStatus(u) || this.acting()) {
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
      this.notice.set(target === 'Suspended' ? 'ระงับผู้ใช้แล้ว' : 'เปิดใช้งานผู้ใช้แล้ว');
      await this.load();
    } catch (e) {
      this.actionError.set(apiErrorMessage(e, 'อัปเดตสถานะผู้ใช้ไม่สำเร็จ'));
    } finally {
      this.acting.set(false);
    }
  }

  protected askResetTestData(): void {
    if (this.resetting() || this.repairing()) {
      return;
    }
    this.resetConfirmOpen.set(true);
  }

  protected async resetTestData(): Promise<void> {
    if (this.resetting() || this.repairing()) {
      return;
    }
    this.resetConfirmOpen.set(false);
    this.resetting.set(true);
    this.actionError.set(null);
    this.notice.set(null);
    try {
      const result = await firstValueFrom(this.api.resetTestData());
      const kept = (result as { keptUsers?: number }).keptUsers ?? 10;
      const deletedReq = (result as { deletedRequests?: number }).deletedRequests ?? 0;
      const seeded = (result as { sampleReviewsSeeded?: number }).sampleReviewsSeeded ?? 0;
      const automated = (result as { deletedAutomatedRequests?: number }).deletedAutomatedRequests ?? 0;
      const deletedUsers = (result as { deletedAutomatedUsers?: number }).deletedAutomatedUsers ?? 0;
      this.usersPage.set(1);
      await this.refreshAfterMutation();
      this.notice.set(
        `รีเซ็ตสำเร็จ — ลบงาน ${deletedReq} รายการ · คงบัญชีทดสอบ ${kept} บัญชี · สร้างรีวิวตัวอย่าง ${seeded} รายการ`,
      );
    } catch (e) {
      this.actionError.set(apiErrorMessage(e, 'รีเซ็ตข้อมูลทดสอบไม่สำเร็จ'));
    } finally {
      this.resetting.set(false);
    }
  }

  protected askRepairTestData(): void {
    if (this.resetting() || this.repairing()) {
      return;
    }
    this.repairConfirmOpen.set(true);
  }

  protected async repairTestData(): Promise<void> {
    if (this.resetting() || this.repairing()) {
      return;
    }
    this.repairConfirmOpen.set(false);
    this.repairing.set(true);
    this.actionError.set(null);
    try {
      const result = await firstValueFrom(this.api.repairTestData());
      const moved = result.reviewReassigned ? 'ย้ายรีวิวแล้ว' : 'รีวิวตรงอยู่แล้วหรือไม่พบ';
      await this.refreshAfterMutation();
      this.notice.set(
        `ซ่อมข้อมูลทดสอบสำเร็จ: ${moved} · ลบงานเก่า ${result.staleRequestsRemoved ?? 0} รายการ`,
      );
    } catch (e) {
      this.actionError.set(apiErrorMessage(e, 'ซ่อมข้อมูลทดสอบไม่สำเร็จ'));
    } finally {
      this.repairing.set(false);
    }
  }

  protected adminRequestStatusLabel(r: ServiceRequestSummary): string {
    const appt = this.appointments().find((a) => a.serviceRequestId === r.id);
    return displayRequestStatusLabel(r.status, appt?.status ?? null);
  }

  protected userLine(u: AdminUserRow): string {
    const name = u.displayName ?? u.lineUserId ?? 'ผู้ใช้';
    const role = adminSystemRoleLabel(u.systemRole ?? 'User');
    const status = adminUserStatusLabel(this.userStatus(u));
    return `${name} · ${role} · ${status}`;
  }

  protected isTestUser(u: AdminUserRow): boolean {
    return !!u.lineUserId?.startsWith('dev-persona-');
  }

  protected notificationLabel(row: AdminNotificationRow): string {
    const type = String(row.eventType ?? row.type ?? '');
    const status = String(row.status ?? '');
    return adminNotificationLine(type, status, row.createdAt);
  }

  protected userStatus(u: AdminUserRow): string {
    return (u as { status?: string }).status ?? 'Active';
  }

  protected formatWhen(iso?: string | null): string {
    return formatScheduledAt(iso);
  }
}
