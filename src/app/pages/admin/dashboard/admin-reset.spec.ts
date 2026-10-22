import { describe, expect, it } from 'vitest';
import {
  ADMIN_RESET_TOAST,
  optimisticAdminDashboardAfterReset,
} from './admin-reset.util';

describe('admin reset optimistic dashboard', () => {
  it('zeros request and notification tiles only', () => {
    const before = {
      users: 10,
      providers: 5,
      publishedRequests: 42,
      completedRequests: 3,
      expiredRequests: 1,
      pendingNotifications: 7,
    };
    expect(optimisticAdminDashboardAfterReset(before)).toEqual({
      users: 10,
      providers: 5,
      publishedRequests: 0,
      completedRequests: 0,
      expiredRequests: 0,
      pendingNotifications: 0,
    });
  });

  it('leaves null dashboard unchanged', () => {
    expect(optimisticAdminDashboardAfterReset(null)).toBeNull();
  });

  it('uses expected reset toast copy', () => {
    expect(ADMIN_RESET_TOAST).toBe('รีเซ็ตข้อมูลทดสอบแล้ว');
  });
});
