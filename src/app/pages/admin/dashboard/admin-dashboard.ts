import { Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../../demo/page-shell';
import { LocalGoApiService } from '../../../core/localgo-api.service';
import { AdminDashboard, AdminNotificationRow, AdminUserRow } from '../../../core/models';
import { apiErrorMessage } from '../../../core/api-error.util';
import { LoadingSkeleton } from '../../../shared/loading-skeleton';

@Component({
  selector: 'app-admin-dashboard-page',
  imports: [PageShell, LoadingSkeleton],
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboardPage implements OnInit {
  protected readonly dashboard = signal<AdminDashboard | null>(null);
  protected readonly users = signal<AdminUserRow[]>([]);
  protected readonly notifications = signal<AdminNotificationRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  private readonly api = inject(LocalGoApiService);

  async ngOnInit(): Promise<void> {
    try {
      const [dashboard, users, notifications] = await Promise.all([
        firstValueFrom(this.api.getAdminDashboard()),
        firstValueFrom(this.api.listAdminUsers()),
        firstValueFrom(this.api.listAdminNotifications()),
      ]);
      this.dashboard.set(dashboard);
      this.users.set(users);
      this.notifications.set(notifications);
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'โหลดหลังบ้านไม่สำเร็จ'));
    } finally {
      this.loading.set(false);
    }
  }

  protected userLine(u: AdminUserRow): string {
    const name = u.displayName ?? u.lineUserId ?? u.id;
    const role = u.systemRole ?? '';
    return `${name} (${role})`;
  }

  protected notificationLabel(row: AdminNotificationRow): string {
    const type = String(row.eventType ?? row.type ?? 'แจ้งเตือน');
    const status = String(row.status ?? '');
    const at = row.createdAt ? new Date(row.createdAt).toLocaleString('th-TH') : '';
    return `${type} · ${status} ${at}`.trim();
  }
}
