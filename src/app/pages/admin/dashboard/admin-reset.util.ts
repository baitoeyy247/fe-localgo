import { AdminDashboard } from '../../../core/models';

/** Optimistic KPI patch after test reset — keeps user/provider counts (10/5/0/0/0/0). */
export function optimisticAdminDashboardAfterReset(
  current: AdminDashboard | null,
  keptUsers = 10,
): AdminDashboard {
  const users = current?.users && current.users > 0 ? current.users : keptUsers;
  const providers = current?.providers && current.providers > 0 ? current.providers : 5;
  return {
    users,
    providers,
    publishedRequests: 0,
    completedRequests: 0,
    expiredRequests: 0,
    pendingNotifications: 0,
  };
}

export const ADMIN_RESET_TOAST = 'รีเซ็ตข้อมูลทดสอบแล้ว';

export function normalizeResetDashboard(raw: unknown): AdminDashboard | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const d = raw as Record<string, unknown>;
  const num = (key: string, alt: string) => Number(d[key] ?? d[alt] ?? 0);
  return {
    users: num('users', 'Users'),
    providers: num('providers', 'Providers'),
    publishedRequests: num('publishedRequests', 'PublishedRequests'),
    completedRequests: num('completedRequests', 'CompletedRequests'),
    expiredRequests: num('expiredRequests', 'ExpiredRequests'),
    pendingNotifications: num('pendingNotifications', 'PendingNotifications'),
  };
}
