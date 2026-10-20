import { formatCoordinates, formatDistanceMeters } from './coordinates';

describe('formatCoordinates', () => {
  it('never prints the unset origin', () => {
    expect(formatCoordinates(0, 0)).toBe('กำลังหาตำแหน่ง…');
    expect(formatCoordinates(0, 0, true)).toBe('กำลังหาตำแหน่ง…');
    expect(formatCoordinates(13.7563, 100.5018, true)).toBe('กำลังหาตำแหน่ง…');
    expect(formatCoordinates(13.7563, 100.5018)).toBe('13.7563, 100.5018');
    expect(formatCoordinates(13.7563, 100.5018)).not.toContain('0.0000, 0.0000');
  });
});

describe('formatDistanceMeters', () => {
  it('uses full words instead of an abbreviated meter unit', () => {
    expect(formatDistanceMeters(1)).toBe('น้อยกว่า 100 เมตร');
    expect(formatDistanceMeters(250)).toBe('250 เมตร');
    expect(formatDistanceMeters(1500)).toBe('1.5 กิโลเมตร');
    expect(formatDistanceMeters(1)).not.toContain('ม.');
  });
});
