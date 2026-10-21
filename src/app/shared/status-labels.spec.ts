import { describe, expect, it } from 'vitest';
import { appointmentStatusLabel, requestStatusLabel } from './status-labels';
import { formatScheduledAt, isWithinAppointmentWindow } from './datetime.util';

describe('request status wording', () => {
  it('does not say the appointment is confirmed before the provider confirms', () => {
    expect(requestStatusLabel('Scheduled')).toBe('รอผู้ให้บริการยืนยันนัด');
    expect(requestStatusLabel('Scheduled', 'Pending')).toBe('รอผู้ให้บริการยืนยันนัด');
    expect(requestStatusLabel('Scheduled', 'Confirmed')).toBe('นัดหมายแล้ว (ยืนยันแล้ว)');
    expect(appointmentStatusLabel('Pending')).toBe('รอผู้ให้บริการยืนยันนัด');
    expect(appointmentStatusLabel('Confirmed')).toBe('นัดหมายแล้ว (ยืนยันแล้ว)');
  });
});

describe('thai datetime', () => {
  it('formats dd/mm/yyyy 24h and opens the window one hour early', () => {
    const formatted = formatScheduledAt('2026-10-21T11:05:00Z');
    expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
    const start = new Date('2026-10-21T18:00:00Z').getTime();
    expect(isWithinAppointmentWindow('2026-10-21T18:00:00Z', start - 60 * 60 * 1000)).toBe(true);
    expect(isWithinAppointmentWindow('2026-10-21T18:00:00Z', start - 60 * 60 * 1000 - 1)).toBe(false);
    expect(isWithinAppointmentWindow(null)).toBe(false);
  });
});
