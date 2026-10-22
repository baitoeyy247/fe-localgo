import { formatScheduledAt } from './datetime.util';
import { summarizeChanges } from './forms/dirty-form.guard';

export const CONFIRM_TEXT_MAX = 80;

/** Truncate long strings in confirm sheets and toasts. */
export function truncateConfirmText(text: string, max = CONFIRM_TEXT_MAX): string {
  const t = text.trim();
  if (t.length <= max) {
    return t;
  }
  return `${t.slice(0, Math.max(1, max - 1))}…`;
}

function toDisplayDatetime(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '—';
  }
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)
    ? new Date(trimmed).toISOString()
    : trimmed;
  return formatScheduledAt(iso);
}

/** Confirm line for datetime-local or ISO values (optional old → new). */
export function formatDatetimeConfirmLine(
  label: string,
  previous: string | null | undefined,
  current: string | null | undefined,
): string {
  const prevFmt = previous?.trim() ? toDisplayDatetime(previous) : '—';
  const curFmt = current?.trim() ? toDisplayDatetime(current) : '—';
  if (!previous?.trim() || prevFmt === curFmt) {
    return `${label}: ${curFmt}`;
  }
  return `${label}: ${prevFmt} → ${curFmt}`;
}

/** Create flows omit "— →" when there is no prior value (L-11). */
export function formatConfirmFieldLine(
  label: string,
  previous: string | null | undefined,
  current: string | null | undefined,
): string {
  const prev = previous?.trim() || '';
  const cur = current?.trim() || '';
  if (!prev || prev === '—') {
    return `${label}: ${cur || '—'}`;
  }
  return `${label}: ${prev} → ${cur || '—'}`;
}

export function formatBidPriceConfirmLine(previous: string, current: string): string {
  const prev = previous.trim();
  const cur = current.trim();
  if (!prev || prev === '—') {
    return `ราคา: ${cur} บาท`;
  }
  return `ราคา: ${prev} → ${cur} บาท`;
}

export function formatBidDescriptionConfirmLine(previous: string, current: string): string | null {
  if (previous.trim() === current.trim()) {
    return null;
  }
  const cur = current.trim();
  if (!cur) {
    return `${'รายละเอียดข้อเสนอ'}: —`;
  }
  return `รายละเอียดข้อเสนอ: ${truncateConfirmText(cur)}`;
}

/** NEW-1: never empty / "ไม่มีการเปลี่ยนแปลง" when rating ≥ 1. */
export function buildReviewConfirmMessage(
  previous: { rating: number; comment: string } | null,
  current: { rating: number; comment: string },
): string {
  const lines: string[] = [];
  if (current.rating >= 1) {
    lines.push(`คะแนน: ★ ${current.rating}`);
  }
  const comment = current.comment.trim();
  if (comment) {
    lines.push(`ความคิดเห็น: ${truncateConfirmText(comment)}`);
  } else if (previous && previous.comment.trim() !== comment) {
    lines.push('ความคิดเห็น: —');
  }
  if (current.rating >= 1) {
    return lines.join('\n');
  }
  return summarizeChanges(lines);
}

export function bidSubmittedToast(priceText: string, isUpdate: boolean): string {
  const price = priceText.trim();
  return isUpdate
    ? `อัปเดตข้อเสนอเป็น ${price} บาทแล้ว`
    : `ส่งข้อเสนอ ${price} บาทแล้ว`;
}

export function withdrawBidConfirmMessage(requestTitle: string, priceText: string): string {
  const title = truncateConfirmText(requestTitle, 60);
  const price = priceText.trim();
  return `ถอนข้อเสนอ ${price} บาท สำหรับ "${title}" — ลูกค้าจะไม่เห็นอีก คุณสามารถส่งข้อเสนอใหม่ได้หากงานยังเปิดรับ`;
}

export function withdrawBidToast(requestTitle: string, priceText: string): string {
  const title = truncateConfirmText(requestTitle, 40);
  const price = priceText.trim();
  return `ถอนข้อเสนอ ${price} บาท สำหรับ "${title}" แล้ว`;
}

export function cancelAppointmentConfirmMessage(
  scheduledAtIso: string | null | undefined,
  requestTitle: string,
): string {
  const when = formatScheduledAt(scheduledAtIso);
  const title = truncateConfirmText(requestTitle, 50);
  return `ยกเลิกนัดหมาย ${when} ของงาน "${title}"?`;
}

export function cancelAppointmentToast(
  scheduledAtIso: string | null | undefined,
  requestTitle: string,
): string {
  const when = formatScheduledAt(scheduledAtIso);
  const title = truncateConfirmText(requestTitle, 40);
  return `ยกเลิกนัดหมาย ${when} ของ "${title}" แล้ว`;
}

export function deleteServiceConfirmMessage(serviceTitle: string): string {
  return `ลบบริการ "${truncateConfirmText(serviceTitle)}" ถาวร — งานที่อ้างอิงบริการนี้อาจได้รับผลกระทบ`;
}

export function deleteServiceToast(serviceTitle: string): string {
  return `ลบบริการ "${truncateConfirmText(serviceTitle, 40)}" แล้ว`;
}

export function suspendUserConfirmMessage(displayName: string): string {
  const name = displayName.trim() || 'ผู้ใช้';
  return `ระงับบัญชี ${name} — ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้จนกว่าจะเปิดใช้งานอีกครั้ง`;
}

export function suspendUserAriaLabel(displayName: string): string {
  const name = displayName.trim() || 'ผู้ใช้';
  return `ระงับบัญชี ${name}`;
}

export function providerConfirmAppointmentToast(scheduledAtIso: string | null | undefined): string {
  return `ยืนยันนัดหมาย ${formatScheduledAt(scheduledAtIso)} แล้ว`;
}

export function providerStartJobToast(requestTitle: string): string {
  return `เริ่มงาน '${truncateConfirmText(requestTitle, 40)}' แล้ว`;
}

export function providerCompleteJobToast(requestTitle: string): string {
  return `ปิดงาน '${truncateConfirmText(requestTitle, 40)}' แล้ว`;
}

export function rejectAppointmentToast(): string {
  return 'ปฏิเสธนัดหมายแล้ว';
}
