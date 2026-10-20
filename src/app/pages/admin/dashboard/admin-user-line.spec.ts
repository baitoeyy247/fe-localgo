import { formatAdminUserLine, uniqueUsers } from './admin-user-line';

describe('admin user list', () => {
  it('shows each account once and distinguishes shared names', () => {
    const rows = [
      { id: '1', displayName: 'Demo Admin', lineUserId: 'dev-aaaaaa111111', systemRole: 'Admin' },
      { id: '1', displayName: 'Demo Admin', lineUserId: 'dev-aaaaaa111111', systemRole: 'Admin' },
      { id: '2', displayName: 'Demo Admin', lineUserId: 'dev-bbbbbb222222', systemRole: 'Admin' },
      { id: '3', displayName: 'สมชาย', lineUserId: 'line-cccccc333333', systemRole: 'User' },
    ];

    const unique = uniqueUsers(rows);
    expect(unique.map((row) => row.id)).toEqual(['1', '2', '3']);
    expect(formatAdminUserLine(unique[0], unique)).toBe('Demo Admin (Admin) · 111111');
    expect(formatAdminUserLine(unique[1], unique)).toBe('Demo Admin (Admin) · 222222');
    expect(formatAdminUserLine(unique[2], unique)).toBe('สมชาย (User)');
  });
});
