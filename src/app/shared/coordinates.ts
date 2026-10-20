/** Never render the unset origin as a coordinate pair. */
export function formatDistanceMeters(meters: number | null | undefined): string {
  if (meters == null || Number.isNaN(meters)) {
    return '—';
  }
  if (meters < 100) {
    return 'น้อยกว่า 100 เมตร';
  }
  if (meters < 1000) {
    return `${Math.round(meters)} เมตร`;
  }
  const km = meters / 1000;
  const text = Number.isInteger(km) ? String(km) : km.toFixed(1);
  return `${text} กิโลเมตร`;
}

export function formatCoordinates(lat: number, lng: number, locating = false): string {
  if (locating || !Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    return 'กำลังหาตำแหน่ง…';
  }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}
