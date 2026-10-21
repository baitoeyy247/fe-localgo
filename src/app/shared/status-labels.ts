const REQUEST_STATUS: Record<string, string> = {
  Draft: 'ฉบับร่าง',
  Open: 'เปิดรับข้อเสนอ',
  HasOffers: 'มีข้อเสนอแล้ว',
  ProviderSelected: 'เลือกผู้ให้บริการแล้ว',
  Selected: 'เลือกผู้ให้บริการแล้ว',
  Scheduled: 'รอผู้ให้บริการยืนยันนัด',
  InProgress: 'กำลังดำเนินงาน',
  Completed: 'เสร็จสิ้น',
  Cancelled: 'ยกเลิก',
  Expired: 'หมดอายุ',
};

const REQUEST_STATUS_COLOR: Record<string, string> = {
  Draft: 'badge--muted',
  Open: 'badge--blue',
  HasOffers: 'badge--orange',
  ProviderSelected: 'badge--green',
  Selected: 'badge--green',
  Scheduled: 'badge--orange',
  InProgress: 'badge--blue',
  Completed: 'badge--success',
  Cancelled: 'badge--muted',
  Expired: 'badge--warn',
};

const BID_STATUS: Record<string, string> = {
  Submitted: 'รอพิจารณา',
  Pending: 'รอพิจารณา',
  Selected: 'ถูกเลือก',
  Rejected: 'ไม่ถูกเลือก',
  Withdrawn: 'ถอนแล้ว',
};

const PROVIDER_TYPE: Record<string, string> = {
  Individual: 'บุคคล',
  Shop: 'ร้านค้า',
  Company: 'บริษัท',
  Freelancer: 'ฟรีแลนซ์',
  Other: 'อื่น ๆ',
};

const APPOINTMENT_STATUS: Record<string, string> = {
  Pending: 'รอผู้ให้บริการยืนยันนัด',
  Confirmed: 'นัดหมายแล้ว (ยืนยันแล้ว)',
  InProgress: 'กำลังดำเนินงาน',
  Completed: 'เสร็จสิ้น',
  Cancelled: 'ยกเลิกแล้ว',
};

const PROVIDER_STATUS: Record<string, string> = {
  Active: 'พร้อมรับงาน',
  Paused: 'หยุดชั่วคราว',
  Inactive: 'ปิดอยู่',
};

/** Same wording everywhere. A scheduled job is not "นัดหมายแล้ว" until the provider confirms. */
export function requestStatusLabel(status: string, appointmentStatus?: string | null): string {
  if (status === 'Scheduled') {
    if (appointmentStatus === 'Confirmed') {
      return 'นัดหมายแล้ว (ยืนยันแล้ว)';
    }
    if (appointmentStatus === 'InProgress') {
      return 'กำลังดำเนินงาน';
    }
    if (appointmentStatus === 'Completed') {
      return 'เสร็จสิ้น';
    }
    return 'รอผู้ให้บริการยืนยันนัด';
  }
  return REQUEST_STATUS[status] ?? 'สถานะอื่น';
}

export function requestStatusBadgeClass(status: string, appointmentStatus?: string | null): string {
  if (status === 'Scheduled' && appointmentStatus === 'Confirmed') {
    return 'badge--green';
  }
  return REQUEST_STATUS_COLOR[status] ?? 'badge--muted';
}

export function bidStatusLabel(status: string): string {
  return BID_STATUS[status] ?? 'สถานะอื่น';
}

export function appointmentStatusLabel(status: string): string {
  return APPOINTMENT_STATUS[status] ?? 'สถานะอื่น';
}

export function providerTypeLabel(type: string): string {
  return PROVIDER_TYPE[type] ?? 'อื่น ๆ';
}

export function providerStatusLabel(status: string): string {
  return PROVIDER_STATUS[status] ?? 'พร้อมรับงาน';
}

export function reviewTypeLabel(type: string): string {
  if (type === 'Verified') {
    return 'รีวิวจากงานจริง';
  }
  if (type === 'Public') {
    return 'รีวิวทั่วไป';
  }
  return 'รีวิว';
}

export const PROVIDER_TYPE_OPTIONS = [
  { value: 'Individual', label: 'บุคคล' },
  { value: 'Shop', label: 'ร้านค้า' },
  { value: 'Company', label: 'บริษัท' },
  { value: 'Freelancer', label: 'ฟรีแลนซ์' },
  { value: 'Other', label: 'อื่น ๆ' },
] as const;
