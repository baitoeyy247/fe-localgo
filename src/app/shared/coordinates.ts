/** Never render the unset origin as a coordinate pair. */
export function formatCoordinates(lat: number, lng: number, locating = false): string {
  if (locating || !Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    return 'กำลังหาตำแหน่ง…';
  }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}
