/** Single source for search-radius copy (card, map overlay, picker). */
export function searchRadiusKmLabel(km: number): string {
  return `${km} กม.`;
}

export function searchRadiusCaption(km: number): string {
  return `รัศมี ${searchRadiusKmLabel(km)}`;
}

export function searchMapOverlayCaption(km: number): string {
  return `พื้นที่ค้นหารัศมี ${searchRadiusKmLabel(km)}`;
}
