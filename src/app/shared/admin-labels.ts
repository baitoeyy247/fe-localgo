const USER_STATUS: Record<string, string> = {
  Active: 'ใช้งานอยู่',
  Suspended: 'ถูกระงับ',
};

const SYSTEM_ROLE: Record<string, string> = {
  User: 'ผู้ใช้ทั่วไป',
  Admin: 'ผู้ดูแลระบบ',
};

const NOTIFICATION_EVENT: Record<string, string> = {
  NewMatchingRequest: 'งานใหม่ตรงบริการของคุณ',
  NewBidReceived: 'มีข้อเสนอราคาใหม่',
  BidSelected: 'ลูกค้าเลือกข้อเสนอ',
  AppointmentCreated: 'มีนัดหมายใหม่',
  AppointmentConfirmed: 'ยืนยันนัดหมาย',
  AppointmentRejected: 'ปฏิเสธนัดหมาย',
  AppointmentCancelled: 'ยกเลิกนัดหมาย',
  JobStarted: 'เริ่มงาน',
  JobCompleted: 'งานเสร็จ',
  ReviewReceived: 'ได้รับรีวิว',
};

const NOTIFICATION_STATUS: Record<string, string> = {
  Pending: 'รอส่ง',
  Sent: 'ส่งแล้ว',
  Skipped: 'ข้าม (ไม่ส่ง)',
  Failed: 'ส่งไม่สำเร็จ',
};

export function adminUserStatusLabel(status: string): string {
  return USER_STATUS[status] ?? 'ไม่ทราบสถานะ';
}

export function adminSystemRoleLabel(role: string): string {
  return SYSTEM_ROLE[role] ?? 'ผู้ใช้';
}

/** Account role for admin user table (not JWT system role). */
export function adminAccountRoleLabel(user: {
  systemRole?: string;
  activeRole?: string | null;
  hasProviderProfile?: boolean;
}): string {
  if (user.systemRole === 'Admin') {
    return 'ผู้ดูแลระบบ';
  }
  if (user.activeRole === 'Provider' || user.hasProviderProfile) {
    return 'ผู้ให้บริการ';
  }
  if (user.activeRole === 'Requester') {
    return 'ผู้รับบริการ';
  }
  return 'ผู้รับบริการ';
}

export function adminNotificationEventLabel(eventType: string): string {
  const key = eventType?.trim() ?? '';
  return NOTIFICATION_EVENT[key] ?? (key ? key : 'แจ้งเตือน');
}

export function adminNotificationStatusLabel(status: string): string {
  const key = status?.trim() ?? '';
  return NOTIFICATION_STATUS[key] ?? (key ? key : '—');
}

export function adminNotificationLine(
  eventType: string,
  status: string,
  createdAt?: string | null,
): string {
  const event = adminNotificationEventLabel(eventType);
  const st = adminNotificationStatusLabel(status);
  const when = createdAt
    ? new Date(createdAt).toLocaleString('th-TH', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '';
  return [event, st, when].filter(Boolean).join(' · ');
}
