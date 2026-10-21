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

const STORAGE_PREFIX = 'localgo.lastLocation.';
const LEGACY_STORAGE_KEY = 'localgo.lastLocation';
const PERSONA_KEY = 'localgo_persona_key';

@Injectable({ providedIn: 'root' })
export class UserLocationService {
  private cached: UserLocationArea | null = null;

  constructor(private readonly geo: GeoService) {}

  /** Last area the user searched/picked — preferred for booking defaults. */
  getLastArea(): (UserLocationArea & { radiusKm: number }) | null {
    this.ensureCacheLoaded();
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
    this.ensureCacheLoaded();
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
          subtitle: 'ตำแหน่งปัจจุบัน',
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
    const key = this.storageKeyForPersona(this.currentPersonaKey());
    try {
      localStorage.setItem(key, JSON.stringify(this.cached));
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(this.cached));
    } catch {
      // ignore quota / private mode
    }
  }

  /** Drop in-memory cache only (logout) — persisted per-persona data stays in localStorage. */
  forgetSessionCache(): void {
    this.cached = null;
  }

  /** Clear persisted area for the current persona (account switch). */
  clear(): void {
    this.cached = null;
    const key = this.storageKeyForPersona(this.currentPersonaKey());
    try {
      localStorage.removeItem(key);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  /** Reload from localStorage after login (same or new persona). */
  reloadFromStorage(personaKey?: string | null): void {
    this.cached = this.readStored(personaKey ?? this.currentPersonaKey());
  }

  private ensureCacheLoaded(): void {
    if (this.cached === null) {
      this.cached = this.readStored(this.currentPersonaKey());
    }
  }

  private currentPersonaKey(): string | null {
    try {
      return sessionStorage.getItem(PERSONA_KEY);
    } catch {
      return null;
    }
  }

  private storageKeyForPersona(personaKey: string | null): string {
    return personaKey ? `${STORAGE_PREFIX}${personaKey}` : LEGACY_STORAGE_KEY;
  }

  private readStored(personaKey: string | null): UserLocationArea | null {
    const keys = personaKey
      ? [this.storageKeyForPersona(personaKey), LEGACY_STORAGE_KEY]
      : [LEGACY_STORAGE_KEY];
    for (const key of keys) {
      const parsed = this.parseStored(localStorage.getItem(key));
      if (parsed) {
        return parsed;
      }
    }
    return null;
  }

  private parseStored(raw: string | null): UserLocationArea | null {
    if (!raw) {
      return null;
    }
    try {
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
