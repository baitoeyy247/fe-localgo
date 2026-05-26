const REQUEST_STATUS: Record<string, string> = {
  Draft: 'ฉบับร่าง',
  Open: 'เปิดรับข้อเสนอ',
  HasOffers: 'มีข้อเสนอแล้ว',
  ProviderSelected: 'เลือกผู้ให้บริการแล้ว',
  Selected: 'เลือกผู้ให้บริการแล้ว',
  Scheduled: 'นัดหมายแล้ว',
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
  Scheduled: 'badge--green',
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

export function requestStatusLabel(status: string): string {
  return REQUEST_STATUS[status] ?? status;
}

export function requestStatusBadgeClass(status: string): string {
  return REQUEST_STATUS_COLOR[status] ?? '';
}

export function bidStatusLabel(status: string): string {
  return BID_STATUS[status] ?? status;
}

const APPOINTMENT_STATUS: Record<string, string> = {
  Pending: 'รอผู้ให้บริการยืนยันนัด',
  Confirmed: 'ผู้ให้บริการยืนยันนัดแล้ว',
  InProgress: 'กำลังดำเนินงาน',
  Completed: 'เสร็จสิ้น',
  Cancelled: 'ยกเลิกแล้ว',
};

export function appointmentStatusLabel(status: string): string {
  return APPOINTMENT_STATUS[status] ?? status;
}

export function providerTypeLabel(type: string): string {
  return PROVIDER_TYPE[type] ?? type;
}

export const PROVIDER_TYPE_OPTIONS = [
  { value: 'Individual', label: 'บุคคล' },
  { value: 'Shop', label: 'ร้านค้า' },
  { value: 'Company', label: 'บริษัท' },
  { value: 'Freelancer', label: 'ฟรีแลนซ์' },
  { value: 'Other', label: 'อื่น ๆ' },
] as const;
