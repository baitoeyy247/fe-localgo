import { Injectable } from '@angular/core';
import { GeoService } from './geo.service';
import { environment } from '../../environments/environment';

export interface UserLocationArea {
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
}

const LAST_AREA_KEY = 'localgo.lastArea';

@Injectable({ providedIn: 'root' })
export class UserLocationService {
  private cached: UserLocationArea | null = null;

  constructor(private readonly geo: GeoService) {}

  /** พยายามใช้ตำแหน่งปัจจุบัน — คืนค่า cache หรือ default หากไม่ได้ */
  async resolveSearchArea(): Promise<UserLocationArea & { radiusKm: number }> {
    if (this.cached) {
      return { ...this.cached, radiusKm: 5 };
    }
    if (!this.geo.isGeolocationAvailable()) {
      return this.defaultArea();
    }
    try {
      const pos = await this.geo.getCurrentPosition();
      const label = await this.geo.reverseGeocode(pos);
      const short = label.split(',').slice(0, 2).join(',').trim() || 'ตำแหน่งปัจจุบัน';
      const area = {
        title: short,
        subtitle: 'ตำแหน่งปัจจุบันของคุณ',
        lat: pos.lat,
        lng: pos.lng,
      };
      this.remember(area);
      return { ...area, radiusKm: 5 };
    } catch {
      return this.defaultArea();
    }
  }

  remember(area: UserLocationArea): void {
    this.cached = area;
    try {
      localStorage.setItem(
        LAST_AREA_KEY,
        JSON.stringify({
          title: area.title,
          subtitle: area.subtitle,
          lat: area.lat,
          lng: area.lng,
        }),
      );
    } catch {
      /* storage can be unavailable in private mode */
    }
  }

  private defaultArea(): UserLocationArea & { radiusKm: number } {
    const saved = this.readSaved();
    if (saved) {
      this.cached = saved;
      return { ...saved, radiusKm: 5 };
    }
    return {
      title: 'กรุงเทพมหานคร',
      subtitle: 'ตำแหน่งเริ่มต้น — ค้นหาสถานที่บนแผนที่เพื่อเปลี่ยน',
      lat: environment.mapDefaultLat,
      lng: environment.mapDefaultLng,
      radiusKm: 5,
    };
  }

  private readSaved(): UserLocationArea | null {
    try {
      const raw = localStorage.getItem(LAST_AREA_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as Partial<UserLocationArea>;
      if (
        typeof parsed.title !== 'string' ||
        !parsed.title.trim() ||
        typeof parsed.lat !== 'number' ||
        typeof parsed.lng !== 'number' ||
        !Number.isFinite(parsed.lat) ||
        !Number.isFinite(parsed.lng)
      ) {
        return null;
      }
      return {
        title: parsed.title,
        subtitle: parsed.subtitle?.trim() || 'ตำแหน่งที่ใช้ล่าสุด',
        lat: parsed.lat,
        lng: parsed.lng,
      };
    } catch {
      return null;
    }
  }
}
