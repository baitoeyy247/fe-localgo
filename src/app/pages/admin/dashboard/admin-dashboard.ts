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
import { appointmentStatusLabel, requestStatusLabel } from '../../../shared/status-labels';

@Component({
  selector: 'app-admin-dashboard-page',
  imports: [PageShell, ErrorState, SkeletonCard],
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
  protected readonly acting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly requestStatusLabel = requestStatusLabel;
  protected readonly appointmentStatusLabel = appointmentStatusLabel;

  private readonly api = inject(LocalGoApiService);

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
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
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'โหลดหลังบ้านไม่สำเร็จ'));
    } finally {
      this.loading.set(false);
    }
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

  protected async toggleUser(u: AdminUserRow): Promise<void> {
    if (!u.id || this.acting()) {
      return;
    }
    const currentStatus = this.userStatus(u);
    const target = currentStatus === 'Suspended' ? 'Active' : 'Suspended';
    this.acting.set(true);
    try {
      await firstValueFrom(this.api.setAdminUserStatus(u.id, target));
      this.notice.set(target === 'Suspended' ? 'ระงับผู้ใช้แล้ว' : 'เปิดใช้งานผู้ใช้แล้ว');
      await this.load();
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'อัปเดตสถานะผู้ใช้ไม่สำเร็จ'));
    } finally {
      this.acting.set(false);
    }
  }

  protected async resetTestData(): Promise<void> {
    if (this.acting()) {
      return;
    }
    if (!confirm('ลบข้อมูลบัญชีทดสอบ (dev-persona-*) ทั้งหมด?')) {
      return;
    }
    this.acting.set(true);
    try {
      const result = await firstValueFrom(this.api.resetTestData());
      this.notice.set(`รีเซ็ตข้อมูลทดสอบแล้ว (ลบ ${result.deletedUsers} ผู้ใช้)`);
      await this.load();
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'รีเซ็ตข้อมูลทดสอบไม่สำเร็จ'));
    } finally {
      this.acting.set(false);
    }
  }

  protected async repairTestData(): Promise<void> {
    if (this.acting()) {
      return;
    }
    this.acting.set(true);
    try {
      const result = await firstValueFrom(this.api.repairTestData());
      const moved = result.reviewReassigned ? 'ย้ายรีวิวแล้ว' : 'รีวิวตรงอยู่แล้วหรือไม่พบ';
      this.notice.set(
        `ซ่อมข้อมูลทดสอบ: ${moved} · ลบงานเก่า ${result.staleRequestsRemoved ?? 0} รายการ`,
      );
      await this.load();
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'ซ่อมข้อมูลทดสอบไม่สำเร็จ'));
    } finally {
      this.acting.set(false);
    }
  }

  protected userLine(u: AdminUserRow): string {
    const name = u.displayName ?? u.lineUserId ?? u.id;
    const role = u.systemRole ?? '';
    const status = (u as { status?: string }).status;
    return status ? `${name} (${role} · ${status})` : `${name} (${role})`;
  }

  protected isTestUser(u: AdminUserRow): boolean {
    return !!u.lineUserId?.startsWith('dev-persona-');
  }

  protected notificationLabel(row: AdminNotificationRow): string {
    const type = String(row.eventType ?? row.type ?? 'แจ้งเตือน');
    const status = String(row.status ?? '');
    const at = row.createdAt ? new Date(row.createdAt).toLocaleString('th-TH') : '';
    return `${type} · ${status} ${at}`.trim();
  }

  protected userStatus(u: AdminUserRow): string {
    return (u as { status?: string }).status ?? 'Active';
  }

  protected formatWhen(iso?: string | null): string {
    if (!iso) {
      return '—';
    }
    try {
      return new Date(iso).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return iso;
    }
  }
}
