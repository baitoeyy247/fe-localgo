import { Injectable } from '@angular/core';
import { GeoService } from './geo.service';
import { environment } from '../../environments/environment';

export interface UserLocationArea {
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  radiusKm?: number;
  /** True when we have no remembered/GPS fix — caller must prompt GPS or map pick. */
  needsPick?: boolean;
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
    if (!this.cached || this.cached.needsPick) {
      return null;
    }
    return {
      ...this.cached,
      radiusKm: this.cached.radiusKm ?? 5,
    };
  }

  /**
   * Prefer last remembered search area.
   * Then GPS. Never silently treat Bangkok map defaults as "current location".
   */
  async resolveSearchArea(): Promise<UserLocationArea & { radiusKm: number }> {
    if (this.cached && !this.cached.needsPick) {
      return {
        ...this.cached,
        subtitle: this.cached.subtitle.includes('ปัจจุบัน')
          ? 'ตำแหน่งที่บันทึกไว้ล่าสุด'
          : this.cached.subtitle,
        radiusKm: this.cached.radiusKm ?? 5,
        needsPick: false,
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
          needsPick: false,
        };
        this.remember(area);
        return { ...area, radiusKm: 5 };
      } catch {
        // fall through — ask user to pick
      }
    }

    return this.needsPickArea();
  }

  remember(area: UserLocationArea & { radiusKm?: number }): void {
    this.cached = {
      title: area.title,
      subtitle: area.subtitle,
      lat: area.lat,
      lng: area.lng,
      radiusKm: area.radiusKm ?? this.cached?.radiusKm ?? 5,
      needsPick: false,
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
        typeof parsed?.title === 'string' &&
        !parsed.needsPick
      ) {
        return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Placeholder until the user grants GPS or picks on the map.
   * Map may center near the env default for panning only — never treat as a real search fix.
   */
  private needsPickArea(): UserLocationArea & { radiusKm: number } {
    return {
      title: 'ยังไม่ได้เลือกตำแหน่ง',
      subtitle: 'อนุญาต GPS หรือเลือกบนแผนที่ — ยังไม่ใช้ตำแหน่งเริ่มต้นค้นหา',
      lat: environment.mapDefaultLat,
      lng: environment.mapDefaultLng,
      radiusKm: 5,
      needsPick: true,
    };
  }
}
