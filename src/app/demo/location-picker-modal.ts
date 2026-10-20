import {
  Component,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { GeoService } from '../core/geo.service';
import { MapSelection, MapView } from './map-view';

export interface LocationPickerValue {
  lat: number;
  lng: number;
  title: string;
  subtitle: string;
  radiusKm: number;
}

@Component({
  selector: 'app-location-picker-modal',
  imports: [MapView],
  template: `
    @if (open()) {
      <div class="location-modal" role="dialog" aria-modal="true" [attr.aria-label]="heading()">
        <div class="location-modal__sheet">
          <header class="location-modal__header">
            <div class="location-modal__intro">
              <span class="app-mark">เลือกตำแหน่ง</span>
              <h2>{{ heading() }}</h2>
              <p>{{ description() }}</p>
            </div>
            <button type="button" class="icon-button" aria-label="ปิด" (click)="cancel.emit()">
              <span aria-hidden="true">×</span>
            </button>
          </header>

          <div class="location-modal__content">
            <section class="location-modal__search" aria-label="ค้นหาและตั้งรัศมี">
              <label class="search-box">
                <span>ค้นหาสถานที่</span>
                <input
                  [value]="draftSearchQuery()"
                  aria-label="ค้นหาสถานที่"
                  placeholder="เช่น หอพัก, ตลาด, ชื่อถนน"
                  (input)="draftSearchQuery.set($any($event.target).value)"
                  (keydown.enter)="runSearch(); $event.preventDefault()"
                />
              </label>

              <div class="location-modal__search-actions">
                <button type="button" class="secondary secondary--pill" [disabled]="searching()" (click)="runSearch()">
                  {{ searching() ? 'กำลังค้นหา…' : 'ค้นหา' }}
                </button>
                <button
                  type="button"
                  class="secondary secondary--pill"
                  [disabled]="locating()"
                  (click)="useCurrentLocation()"
                >
                  {{ locating() ? 'กำลังหาตำแหน่ง…' : 'ตำแหน่งปัจจุบัน' }}
                </button>
              </div>

              @if (geoError()) {
                <p class="error-text">{{ geoError() }}</p>
              }

              <div class="pill-tabs" aria-label="ตัวเลือกรัศมี">
                @for (radius of radiusOptions(); track radius) {
                  <button
                    type="button"
                    [class.is-active]="draftRadiusKm() === radius"
                    (click)="setRadius(radius)"
                  >
                    {{ radius }} กม.
                  </button>
                }
              </div>
            </section>

            <section class="location-modal__map" aria-label="แผนที่เลือกตำแหน่ง">
              <app-map-view
                #mapRef
                label="แตะเพื่อเลือกตำแหน่ง"
                [lat]="draftLat()"
                [lng]="draftLng()"
                [radiusKm]="draftRadiusKm()"
                [radiusLabel]="radiusText()"
                [zoom]="16"
                [showOverlay]="false"
                (selected)="updateSelection($event)"
              />
            </section>

            <section class="location-modal__selection" aria-label="ตำแหน่งที่กำลังเลือก">
              <div class="location-modal__selection-head">
                <span class="badge">ตำแหน่งที่กำลังเลือก</span>
                <strong>{{ placeTitle() }}</strong>
                <p>{{ placeSubtitle() }}</p>
                <p>{{ radiusText() }}</p>
              </div>
              <div class="stat-row">
                <article>
                  <small>ละติจูด</small>
                  <strong>{{ draftLat().toFixed(5) }}</strong>
                </article>
                <article>
                  <small>ลองจิจูด</small>
                  <strong>{{ draftLng().toFixed(5) }}</strong>
                </article>
              </div>
            </section>

            <section class="location-modal__actions" aria-label="ยืนยันตำแหน่ง">
              <button type="button" class="primary" (click)="confirmSelection()">ยืนยันและใช้ตำแหน่งนี้</button>
              <button type="button" class="secondary" (click)="cancel.emit()">ยกเลิก</button>
            </section>
          </div>
        </div>
      </div>
    }
  `,
})
export class LocationPickerModal {
  readonly open = input(false);
  readonly heading = input('เลือกตำแหน่ง');
  readonly description = input('ลากแผนที่เพื่อเลื่อนดู แตะจุดที่ต้องการ แล้วเลื่อนหน้าลงมากดยืนยัน');
  readonly locationTitle = input('พื้นที่บริการ');
  readonly locationSubtitle = input('จุดที่เลือกไว้ล่าสุด');
  readonly searchText = input('พื้นที่บริการ');
  readonly radiusKm = input(5);
  readonly lat = input(13.7563);
  readonly lng = input(100.5018);
  readonly radiusOptions = input<number[]>([1, 3, 5, 8]);
  /** เมื่อเปิด modal ครั้งแรก ให้พยายามโฟกัสตำแหน่งปัจจุบันอัตโนมัติ */
  readonly autoLocateOnOpen = input(true);

  readonly confirm = output<LocationPickerValue>();
  readonly cancel = output<void>();

  @ViewChild('mapRef') private mapRef?: MapView;

  protected readonly draftLat = signal(13.7563);
  protected readonly draftLng = signal(100.5018);
  protected readonly draftRadiusKm = signal(5);
  protected readonly draftSearchQuery = signal('');
  protected readonly placeTitle = signal('พื้นที่ที่เลือก');
  protected readonly placeSubtitle = signal('');
  protected readonly searching = signal(false);
  protected readonly locating = signal(false);
  protected readonly geoError = signal<string | null>(null);

  protected readonly radiusText = computed(() => `รัศมี ${this.draftRadiusKm()} กม.`);

  private readonly geo = inject(GeoService);
  private autoLocateAttempted = false;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.syncDraft();
        this.draftSearchQuery.set(this.searchText() || this.locationTitle());
        this.geoError.set(null);
        queueMicrotask(() => this.refreshMapSoon());
        if (this.autoLocateOnOpen() && !this.autoLocateAttempted) {
          this.autoLocateAttempted = true;
          void this.useCurrentLocation(true);
        }
      }
    });
  }

  protected setRadius(km: number): void {
    this.draftRadiusKm.set(km);
    this.mapRef?.refreshSize();
  }

  protected updateSelection(selection: MapSelection): void {
    this.draftLat.set(selection.lat);
    this.draftLng.set(selection.lng);
    void this.refreshPlaceLabel(selection.lat, selection.lng);
  }

  protected async runSearch(): Promise<void> {
    const q = this.draftSearchQuery().trim();
    if (q.length < 2) {
      this.geoError.set('พิมพ์ชื่อสถานที่อย่างน้อย 2 ตัวอักษร');
      return;
    }
    this.searching.set(true);
    this.geoError.set(null);
    try {
      const place = await this.geo.searchPlace(q);
      if (!place) {
        this.geoError.set('ไม่พบสถานที่ — ลองคำอื่นหรือเลือกบนแผนที่');
        return;
      }
      this.applyPlace(place.lat, place.lng, place.displayName);
    } catch (e) {
      this.geoError.set(e instanceof Error ? e.message : 'ค้นหาไม่สำเร็จ');
    } finally {
      this.searching.set(false);
    }
  }

  protected async useCurrentLocation(silent = false): Promise<void> {
    this.locating.set(true);
    if (!silent) {
      this.geoError.set(null);
    }
    try {
      const pos = await this.geo.getCurrentPosition();
      const label = await this.geo.reverseGeocode(pos);
      this.applyPlace(pos.lat, pos.lng, label);
    } catch (e) {
      if (!silent) {
        this.geoError.set(e instanceof Error ? e.message : 'หาตำแหน่งไม่สำเร็จ');
      }
    } finally {
      this.locating.set(false);
    }
  }

  protected confirmSelection(): void {
    this.confirm.emit({
      lat: this.draftLat(),
      lng: this.draftLng(),
      title: this.placeTitle(),
      subtitle: this.placeSubtitle(),
      radiusKm: this.draftRadiusKm(),
    });
  }

  private applyPlace(lat: number, lng: number, displayName: string): void {
    this.draftLat.set(lat);
    this.draftLng.set(lng);
    const short = displayName.split(',').slice(0, 2).join(',').trim() || displayName;
    this.placeTitle.set(short);
    this.placeSubtitle.set(displayName);
    this.draftSearchQuery.set(short);
    this.mapRef?.flyTo(lat, lng, 16);
    setTimeout(() => this.mapRef?.refreshSize(), 400);
  }

  private async refreshPlaceLabel(lat: number, lng: number): Promise<void> {
    try {
      const label = await this.geo.reverseGeocode({ lat, lng });
      const short = label.split(',').slice(0, 2).join(',').trim() || label;
      this.placeTitle.set(short);
      this.placeSubtitle.set(label);
      this.draftSearchQuery.set(short);
    } catch {
      this.placeTitle.set('พิกัดที่เลือก');
      this.placeSubtitle.set(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  }

  private syncDraft(): void {
    this.draftLat.set(this.lat());
    this.draftLng.set(this.lng());
    this.draftRadiusKm.set(this.radiusKm());
    this.placeTitle.set(this.locationTitle());
    this.placeSubtitle.set(this.locationSubtitle());
  }

  private refreshMapSoon(): void {
    setTimeout(() => this.mapRef?.refreshSize(), 50);
    setTimeout(() => this.mapRef?.refreshSize(), 400);
  }
}
