import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import {
  ADMIN_RESET_TOAST,
  ADMIN_TOOL_DISABLED_MESSAGE,
  adminToolErrorMessage,
  normalizeResetDashboard,
} from './admin-reset.util';

describe('admin reset util', () => {
  it('returns null (no 10/5 defaults) when BE sends no dashboard', () => {
    expect(normalizeResetDashboard(null)).toBeNull();
    expect(normalizeResetDashboard(undefined)).toBeNull();
  });

  it('maps BE dashboard (camel or Pascal case) without inventing values', () => {
    expect(normalizeResetDashboard({ Users: 3, providers: 1 })).toEqual({
      users: 3,
      providers: 1,
      publishedRequests: 0,
      completedRequests: 0,
      expiredRequests: 0,
      pendingNotifications: 0,
    });
  });

  it('maps 404 to the production-mode disabled copy', () => {
    expect(adminToolErrorMessage(new HttpErrorResponse({ status: 404 }), 'x')).toBe(ADMIN_TOOL_DISABLED_MESSAGE);
    expect(ADMIN_TOOL_DISABLED_MESSAGE).toBe('ฟังก์ชันนี้ปิดอยู่ในโหมดใช้งานจริง');
  });

  it('keeps fallback for other errors', () => {
    expect(adminToolErrorMessage(new Error(''), 'รีเซ็ตไม่สำเร็จ')).toBe('รีเซ็ตไม่สำเร็จ');
  });

  it('uses expected reset toast copy', () => {
    expect(ADMIN_RESET_TOAST).toBe('รีเซ็ตข้อมูลทดสอบแล้ว');
  });
});
