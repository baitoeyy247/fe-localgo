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
