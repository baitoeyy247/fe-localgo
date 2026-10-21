import { Injectable } from '@angular/core';
import { GeoService } from './geo.service';
import { environment } from '../../environments/environment';

export interface UserLocationArea {
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  radiusKm?: number;
}

const STORAGE_KEY = 'localgo.lastLocation';

@Injectable({ providedIn: 'root' })
export class UserLocationService {
  private cached: UserLocationArea | null = null;

  constructor(private readonly geo: GeoService) {
    this.cached = this.readStored();
  }

  /** Last area the user searched/picked — preferred for booking defaults. */
  getLastArea(): (UserLocationArea & { radiusKm: number }) | null {
    if (!this.cached) {
      return null;
    }
    return {
      ...this.cached,
      radiusKm: this.cached.radiusKm ?? 5,
    };
  }

  /**
   * Prefer last remembered search area (so Mahasarakham stays Mahasarakham).
   * Then GPS. Never silently treat Bangkok map defaults as "current location".
   */
  async resolveSearchArea(): Promise<UserLocationArea & { radiusKm: number }> {
    if (this.cached) {
      return {
        ...this.cached,
        subtitle: this.cached.subtitle.includes('ปัจจุบัน')
          ? 'ตำแหน่งที่บันทึกไว้ล่าสุด'
          : this.cached.subtitle,
        radiusKm: this.cached.radiusKm ?? 5,
      };
    }

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
          radiusKm: 5,
        };
        this.remember(area);
        return { ...area, radiusKm: 5 };
      } catch {
        // fall through
      }
    }

    return this.defaultArea();
  }

  remember(area: UserLocationArea & { radiusKm?: number }): void {
    this.cached = {
      title: area.title,
      subtitle: area.subtitle,
      lat: area.lat,
      lng: area.lng,
      radiusKm: area.radiusKm ?? this.cached?.radiusKm ?? 5,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cached));
    } catch {
      // ignore quota / private mode
    }
  }

  /** Clear remembered search area / radius (logout or account switch). */
  clear(): void {
    this.cached = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
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
