import { AdminDashboard } from '../../../core/models';

/** Optimistic KPI patch after test reset — keeps user/provider counts. */
export function optimisticAdminDashboardAfterReset(
  current: AdminDashboard | null,
): AdminDashboard | null {
  if (!current) {
    return current;
  }
  return {
    ...current,
    publishedRequests: 0,
    completedRequests: 0,
    expiredRequests: 0,
    pendingNotifications: 0,
  };
}

export const ADMIN_RESET_TOAST = 'รีเซ็ตข้อมูลทดสอบแล้ว';
