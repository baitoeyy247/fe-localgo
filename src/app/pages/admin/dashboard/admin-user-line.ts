import { AdminUserRow } from '../../../core/models';

export function uniqueUsers(rows: AdminUserRow[]): AdminUserRow[] {
  const seen = new Set<string>();
  const unique: AdminUserRow[] = [];
  for (const row of rows) {
    const key = row.id || row.lineUserId;
    if (key) {
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
    }
    unique.push(row);
  }
  return unique;
}

export function formatAdminUserLine(user: AdminUserRow, all: AdminUserRow[]): string {
  const name = user.displayName?.trim() || user.lineUserId || user.id || 'ผู้ใช้';
  const role = user.systemRole ?? '';
  const sameName = all.filter((row) => (row.displayName ?? '') === (user.displayName ?? '')).length > 1;
  const identifier = user.lineUserId || user.id || '';
  const suffix = sameName && identifier ? ` · ${identifier.slice(-6)}` : '';
  return `${name} (${role})${suffix}`;
}
