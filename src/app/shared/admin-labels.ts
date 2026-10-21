const USER_STATUS: Record<string, string> = {
  Active: 'ใช้งานอยู่',
  Suspended: 'ถูกระงับ',
};

const SYSTEM_ROLE: Record<string, string> = {
  User: 'ผู้ใช้ทั่วไป',
  Admin: 'ผู้ดูแลระบบ',
};

const NOTIFICATION_EVENT: Record<string, string> = {
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

export function adminNotificationLine(
  eventType: string,
  status: string,
  createdAt?: string | null,
): string {
  const event = NOTIFICATION_EVENT[eventType] ?? 'แจ้งเตือน';
  const st = NOTIFICATION_STATUS[status] ?? status;
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
