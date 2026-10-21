import { Injectable } from '@angular/core';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoPlace extends GeoPoint {
  displayName: string;
}

@Injectable({ providedIn: 'root' })
export class GeoService {
  private readonly nominatimBase = 'https://nominatim.openstreetmap.org';
  private readonly fetchHeaders: HeadersInit = {
    Accept: 'application/json',
    'Accept-Language': 'th,en',
    'User-Agent': 'LocalGo/1.0 (DFW campus marketplace prototype)',
  };

  isGeolocationAvailable(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.geolocation;
  }

  getCurrentPosition(): Promise<GeoPoint> {
    return new Promise((resolve, reject) => {
      if (!this.isGeolocationAvailable()) {
        reject(new Error('อุปกรณ์ไม่รองรับการระบุตำแหน่ง'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        (err) => {
          const msg =
            err.code === err.PERMISSION_DENIED
              ? 'ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง — เปิดใน Settings ของเบราว์เซอร์/LINE'
              : err.code === err.TIMEOUT
                ? 'หาตำแหน่งไม่ทันเวลา — ลองอีกครั้ง'
                : 'หาตำแหน่งปัจจุบันไม่สำเร็จ';
          reject(new Error(msg));
        },
        { enableHighAccuracy: false, timeout: 8_000, maximumAge: 60_000 },
      );
    });
  }

  async searchPlace(query: string): Promise<GeoPlace | null> {
    const q = query.trim();
    if (q.length < 2) {
      return null;
    }
    const params = new URLSearchParams({
      format: 'json',
      limit: '1',
      q,
      countrycodes: 'th',
      addressdetails: '1',
    });
    const res = await fetch(`${this.nominatimBase}/search?${params}`, {
      headers: this.fetchHeaders,
    });
    if (!res.ok) {
      throw new Error('ค้นหาสถานที่ไม่สำเร็จ');
    }
    const items = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    const hit = items[0];
    if (!hit) {
      return null;
    }
    return {
      lat: Number(hit.lat),
      lng: Number(hit.lon),
      displayName: hit.display_name,
    };
  }

  async reverseGeocode(point: GeoPoint): Promise<string> {
    const params = new URLSearchParams({
      format: 'json',
      lat: String(point.lat),
      lon: String(point.lng),
      zoom: '16',
      addressdetails: '1',
    });
    const res = await fetch(`${this.nominatimBase}/reverse?${params}`, {
      headers: this.fetchHeaders,
    });
    if (!res.ok) {
      return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
    }
    const data = (await res.json()) as { display_name?: string };
    return data.display_name ?? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
  }
}
