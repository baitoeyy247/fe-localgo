import { GLOSSARY } from './glossary';

const REQUEST_STATUS: Record<string, string> = {
  Draft: 'ฉบับร่าง',
  Open: 'เปิดรับข้อเสนอ',
  HasOffers: 'มีข้อเสนอแล้ว',
  ProviderSelected: 'เลือกผู้ให้บริการแล้ว',
  Selected: 'เลือกผู้ให้บริการแล้ว',
  Scheduled: 'นัดหมายแล้ว',
  InProgress: 'กำลังดำเนินงาน',
  Completed: 'เสร็จสิ้น',
  Cancelled: 'ยกเลิกแล้ว',
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

/**
 * Request status label that accounts for the appointment state.
 * `Scheduled` / `ProviderSelected` must not read "นัดหมายแล้ว" while the appointment is still pending.
 */
export type StatusViewer = 'requester' | 'provider' | 'admin';

/** T4-1: provider sees their own actions in first person. */
const PROVIDER_APPOINTMENT_STATUS: Record<string, string> = {
  Pending: 'รอคุณยืนยันนัดหมาย',
  Confirmed: 'คุณยืนยันนัดหมายแล้ว',
  Rejected: 'คุณปฏิเสธนัดหมาย',
};

export function displayRequestStatusLabel(
  status: string,
  appointmentStatus?: string | null,
  viewer: StatusViewer = 'requester',
): string {
  if (status === 'Completed' || status === 'InProgress') {
    return requestStatusLabel(status);
  }
  if (viewer === 'provider' && appointmentStatus && PROVIDER_APPOINTMENT_STATUS[appointmentStatus]
      && status !== 'Cancelled' && (appointmentStatus !== 'Pending' || status === 'Scheduled' || status === 'ProviderSelected' || status === 'Selected')) {
    return PROVIDER_APPOINTMENT_STATUS[appointmentStatus];
  }
  if (appointmentStatus === 'Rejected') {
    return REJECTED_APPOINTMENT_COPY.title;
  }
  if (appointmentStatus === 'Cancelled' || status === 'Cancelled') {
    return 'ยกเลิกแล้ว';
  }
  if (status === 'Scheduled' || status === 'ProviderSelected' || status === 'Selected') {
    if (appointmentStatus === 'Confirmed') {
      return 'ผู้ให้บริการยืนยันนัดหมายแล้ว';
    }
    if (!appointmentStatus || appointmentStatus === 'Pending') {
      return 'รอผู้ให้บริการยืนยันนัดหมาย';
    }
    if (appointmentStatus === 'InProgress') {
      return 'กำลังดำเนินงาน';
    }
    if (appointmentStatus === 'Completed') {
      return 'เสร็จสิ้น';
    }
  }
  return requestStatusLabel(status);
}

export function displayRequestStatusBadgeClass(
  status: string,
  appointmentStatus?: string | null,
): string {
  if (appointmentStatus === 'Rejected') {
    return 'badge--red';
  }
  if (appointmentStatus === 'Cancelled' || status === 'Cancelled') {
    return 'badge--muted';
  }
  if (status === 'Scheduled' || status === 'ProviderSelected' || status === 'Selected') {
    if (appointmentStatus === 'Confirmed') {
      return 'badge--green';
    }
    return 'badge--orange';
  }
  return requestStatusBadgeClass(status);
}

export function requestStatusBadgeClass(status: string): string {
  return REQUEST_STATUS_COLOR[status] ?? '';
}

export function bidStatusLabel(status: string): string {
  return BID_STATUS[status] ?? status;
}

export type ProviderBidFilterKey =
  | 'all'
  | 'waiting'
  | 'selected'
  | 'confirm'
  | 'inprogress'
  | 'done'
  | 'withdrawn'
  | 'rejected';

export interface ProviderBidRowView {
  key: ProviderBidFilterKey;
  label: string;
  badgeClass: string;
}

/** Provider “my bids” list row — composite job + bid + appointment state. */
export function providerBidRowStatus(item: {
  status: string;
  requestStatus?: string | null;
  appointmentStatus?: string | null;
}): ProviderBidRowView {
  if (item.appointmentStatus === 'Cancelled' || item.requestStatus === 'Cancelled') {
    return { key: 'withdrawn', label: 'ยกเลิกแล้ว', badgeClass: 'badge--muted' };
  }
  if (item.appointmentStatus === 'Rejected') {
    return { key: 'rejected', label: 'คุณปฏิเสธนัดหมาย', badgeClass: 'badge--red' };
  }
  if (item.status === 'Withdrawn') {
    return { key: 'withdrawn', label: 'ถอนแล้ว', badgeClass: 'badge--muted' };
  }
  if (item.requestStatus === 'Completed') {
    return { key: 'done', label: 'เสร็จ', badgeClass: 'badge--success' };
  }
  if (item.requestStatus === 'InProgress' || item.appointmentStatus === 'InProgress') {
    return { key: 'inprogress', label: 'กำลังทำ', badgeClass: 'badge--blue' };
  }
  if (item.status === 'Selected') {
    if (!item.appointmentStatus || item.appointmentStatus === 'Pending') {
      return { key: 'confirm', label: GLOSSARY.pendingAppointmentConfirmChip, badgeClass: 'badge--orange' };
    }
    return { key: 'selected', label: 'ถูกเลือก', badgeClass: 'badge--green' };
  }
  if (item.status === 'Submitted' || item.status === 'Pending') {
    return { key: 'waiting', label: 'รอผล', badgeClass: 'badge--orange' };
  }
  if (item.status === 'Rejected') {
    return { key: 'waiting', label: 'ไม่ถูกเลือก', badgeClass: 'badge--muted' };
  }
  return { key: 'waiting', label: bidStatusLabel(item.status), badgeClass: 'badge--muted' };
}

const APPOINTMENT_STATUS: Record<string, string> = {
  Pending: 'รอผู้ให้บริการยืนยันนัดหมาย',
  Confirmed: 'ผู้ให้บริการยืนยันนัดหมายแล้ว',
  InProgress: 'กำลังดำเนินงาน',
  Completed: 'เสร็จสิ้น',
  Cancelled: 'ยกเลิกแล้ว',
  Rejected: 'ผู้ให้บริการปฏิเสธนัดหมาย',
};

export function appointmentStatusLabel(status: string, viewer: StatusViewer = 'requester'): string {
  if (viewer === 'provider' && PROVIDER_APPOINTMENT_STATUS[status]) {
    return PROVIDER_APPOINTMENT_STATUS[status];
  }
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

/** Terminal appointment — hide all action buttons. */
export function isTerminalAppointment(status?: string | null): boolean {
  return status === 'Cancelled' || status === 'Rejected';
}

/** R41 T4-26b/26c: single source for the requester's view of a rejected appointment (all pages + home card). */
export const REJECTED_APPOINTMENT_COPY = {
  title: 'ผู้ให้บริการปฏิเสธนัดหมาย',
  action: 'นัดใหม่หรือเลือกข้อเสนออื่น',
} as const;

export function rejectedRebookTarget(requestId: string | null | undefined): { path: string; queryParams: Record<string, string> } {
  return { path: '/requester/bids', queryParams: requestId ? { requestId } : {} };
}
