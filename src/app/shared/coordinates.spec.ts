import { formatCoordinates } from './coordinates';

describe('formatCoordinates', () => {
  it('never prints the unset origin', () => {
    expect(formatCoordinates(0, 0)).toBe('กำลังหาตำแหน่ง…');
    expect(formatCoordinates(0, 0, true)).toBe('กำลังหาตำแหน่ง…');
    expect(formatCoordinates(13.7563, 100.5018, true)).toBe('กำลังหาตำแหน่ง…');
    expect(formatCoordinates(13.7563, 100.5018)).toBe('13.7563, 100.5018');
    expect(formatCoordinates(13.7563, 100.5018)).not.toContain('0.0000, 0.0000');
  });
});
