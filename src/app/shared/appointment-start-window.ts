/** Matches backend AppointmentStartWindow.EarlyStartAllowed (start at scheduled time). */
export const APPOINTMENT_START_EARLY_MS = 0;

export function earliestJobStartMs(scheduledAtIso: string): number | null {
  const scheduled = new Date(scheduledAtIso).getTime();
  if (Number.isNaN(scheduled)) {
    return null;
  }
  return scheduled - APPOINTMENT_START_EARLY_MS;
}

export function canStartJobAt(scheduledAtIso: string | null | undefined, nowMs = Date.now()): boolean {
  if (!scheduledAtIso) {
    return false;
  }
  const earliest = earliestJobStartMs(scheduledAtIso);
  return earliest !== null && nowMs >= earliest;
}
