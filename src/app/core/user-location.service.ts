import { Injectable } from '@angular/core';
import { GeoPoint, GeoService } from './geo.service';
import { environment } from '../../environments/environment';

export interface UserLocationArea {
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
}

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
      this.cached = {
        title: short,
        subtitle: 'ตำแหน่งปัจจุบันของคุณ',
        lat: pos.lat,
        lng: pos.lng,
      };
      return { ...this.cached, radiusKm: 5 };
    } catch {
      return this.defaultArea();
    }
  }

  remember(area: UserLocationArea): void {
    this.cached = area;
  }

  private defaultArea(): UserLocationArea & { radiusKm: number } {
    return {
      title: 'พื้นที่ค้นหาเริ่มต้น',
      subtitle: 'อนุญาตตำแหน่งเพื่อค้นหาใกล้คุณ — หรือเลือกบนแผนที่',
      lat: environment.mapDefaultLat,
      lng: environment.mapDefaultLng,
      radiusKm: 5,
    };
  }
}
