const TH_LOCALE = 'th-TH';
const SCHEDULED_FALLBACK = 'ยังไม่ระบุเวลา';

/** Display ISO datetime for Thai users. */
export function formatScheduledAt(value?: string | null): string {
  if (!value) {
    return SCHEDULED_FALLBACK;
  }
  return new Date(value).toLocaleString(TH_LOCALE, {
    dateStyle: 'medium',
    timeStyle: 'short',
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
