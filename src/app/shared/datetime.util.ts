const SCHEDULED_FALLBACK = 'ยังไม่ระบุเวลา';
const EARLY_WINDOW_MS = 60 * 60 * 1000;

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

/** Thai display datetime: dd/mm/yyyy HH:mm in the viewer's local time. */
export function formatScheduledAt(value?: string | null): string {
  if (!value) {
    return SCHEDULED_FALLBACK;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return SCHEDULED_FALLBACK;
  }
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Start and complete are allowed from one hour before the appointment. */
export function isWithinAppointmentWindow(scheduledAt?: string | null, now = Date.now()): boolean {
  if (!scheduledAt) {
    return false;
  }
  const time = new Date(scheduledAt).getTime();
  if (Number.isNaN(time)) {
    return false;
  }
  return now >= time - EARLY_WINDOW_MS;
}

/** Value for HTML `datetime-local` inputs. */
export function toDatetimeLocal(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

/** Default appointment slot: tomorrow on the hour. */
export function defaultAppointmentDatetimeLocal(): string {
  const tomorrow = new Date(Date.now() + 86400000);
  tomorrow.setMinutes(0, 0, 0);
  return toDatetimeLocal(tomorrow);
}
