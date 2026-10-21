import { Injectable } from '@angular/core';
import { GeoService } from './geo.service';
import { environment } from '../../environments/environment';

export interface UserLocationArea {
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
}

const STORAGE_KEY = 'localgo.lastLocation';

@Injectable({ providedIn: 'root' })
export class UserLocationService {
  private cached: UserLocationArea | null = null;

  constructor(private readonly geo: GeoService) {
    this.cached = this.readStored();
  }

  /**
   * 1) Ask geolocation first
   * 2) Fall back to last remembered location
   * 3) Fall back to map default — never label defaults as "ตำแหน่งปัจจุบันของคุณ"
   */
  async resolveSearchArea(): Promise<UserLocationArea & { radiusKm: number }> {
    if (this.geo.isGeolocationAvailable()) {
      try {
        const pos = await this.geo.getCurrentPosition();
        const label = await this.geo.reverseGeocode(pos);
        const short = label.split(',').slice(0, 2).join(',').trim() || 'ตำแหน่งปัจจุบัน';
        const area: UserLocationArea = {
          title: short,
          subtitle: 'ตำแหน่งปัจจุบันของคุณ',
          lat: pos.lat,
          lng: pos.lng,
        };
        this.remember(area);
        return { ...area, radiusKm: 5 };
      } catch {
        // fall through
      }
    }

    if (this.cached) {
      return {
        ...this.cached,
        subtitle: this.cached.subtitle.includes('ปัจจุบัน')
          ? 'ตำแหน่งที่บันทึกไว้ล่าสุด'
          : this.cached.subtitle,
        radiusKm: 5,
      };
    }

    return this.defaultArea();
  }

  remember(area: UserLocationArea): void {
    this.cached = area;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(area));
    } catch {
      // ignore quota / private mode
    }
  }

  private readStored(): UserLocationArea | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as UserLocationArea;
      if (
        typeof parsed?.lat === 'number' &&
        typeof parsed?.lng === 'number' &&
        typeof parsed?.title === 'string'
      ) {
        return parsed;
      }
    } catch {
      // ignore
    }
    return null;
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
