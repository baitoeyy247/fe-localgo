import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage } from '../../../core/api-error.util';
import { AdminDashboard } from '../../../core/models';

export const ADMIN_RESET_TOAST = 'รีเซ็ตข้อมูลทดสอบแล้ว';

/** A-1: BE answers 404 for test-data tools when dev login / test mode is off. */
export const ADMIN_TOOL_DISABLED_MESSAGE = 'ฟังก์ชันนี้ปิดอยู่ในโหมดใช้งานจริง';

export function adminToolErrorMessage(err: unknown, fallback: string): string {
  const status =
    err instanceof HttpErrorResponse ? err.status : ((err as { status?: number } | null)?.status ?? -1);
  if (status === 404) {
    return ADMIN_TOOL_DISABLED_MESSAGE;
  }
  return apiErrorMessage(err, fallback);
}

/** Parse the dashboard the BE returns with a reset result. No invented defaults: null when absent. */
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
