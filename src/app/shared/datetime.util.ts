const TH_LOCALE = 'th-TH';
const SCHEDULED_FALLBACK = 'ยังไม่ระบุเวลา';

/** Display ISO datetime for Thai users (พ.ศ. + 24 ชั่วโมง). */
export function formatScheduledAt(value?: string | null): string {
  if (!value) {
    return SCHEDULED_FALLBACK;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return SCHEDULED_FALLBACK;
  }
  return d.toLocaleString(TH_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Value for HTML `datetime-local` inputs. */
export function toDatetimeLocal(value: Date): string {
  const pad = (n: number): string => n.toString().padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

/** Default appointment slot: tomorrow on the hour. */
export function defaultAppointmentDatetimeLocal(): string {
  const tomorrow = new Date(Date.now() + 86400000);
  tomorrow.setMinutes(0, 0, 0);
  return toDatetimeLocal(tomorrow);
}
