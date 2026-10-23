import {
  AfterViewInit,
  Component,
  ElementRef,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  input,
  output,
  signal,
} from '@angular/core';
import * as L from 'leaflet';

type MapSize = 'hero' | 'default' | 'compact';
export interface MapSelection {
  lat: number;
  lng: number;
}

const markerIcon = L.divIcon({
  className: 'localgo-map-marker',
  html: '<span></span>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

@Component({
  selector: 'app-map-view',
  template: `
    <div class="real-map" [class.real-map--hero]="size() === 'hero'" [class.real-map--compact]="size() === 'compact'">
      <div #mapContainer class="real-map__canvas" aria-label="แผนที่เลือกตำแหน่ง"></div>
      @if (showOverlay()) {
        <div class="real-map__overlay">
          <span>{{ label() }}</span>
          <strong>{{ selectedLabel() }}</strong>
        </div>
      }
    </div>
  `,
})
export class MapView implements AfterViewInit, OnChanges, OnDestroy {
  readonly size = input<MapSize>('default');
  readonly label = input('พื้นที่บริการ');
  readonly radiusLabel = input('');
  readonly radiusKm = input<number | null>(null);
  readonly lat = input(13.7563);
  readonly lng = input(100.5018);
  readonly zoom = input(14);
  readonly selectable = input(true);
  readonly dragging = input(true);
  readonly showOverlay = input(true);
  readonly selected = output<MapSelection>();

  @ViewChild('mapContainer', { static: true })
  private readonly mapContainer!: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private marker?: L.Marker;
  private circle?: L.Circle;

  protected readonly selectedLabel = signal('');

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) {
      return;
    }

    if (changes['lat'] || changes['lng']) {
      const nextCenter = L.latLng(this.lat(), this.lng());
      this.placeMarker(nextCenter);
      const animate = !changes['lat']?.firstChange && !changes['lng']?.firstChange;
      this.map.setView(nextCenter, this.map.getZoom(), { animate });
    }

    if (changes['dragging']) {
      this.syncDragging();
    }

    if (changes['radiusLabel'] || changes['radiusKm']) {
      this.syncRadiusCaption();
      if (this.marker) {
        this.placeMarker(this.marker.getLatLng());
      }
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = undefined;
  }

  /** Call after modal open — fixes blank/grey tiles */
  refreshSize(): void {
    if (!this.map) {
      return;
    }
    this.map.invalidateSize();
    const center = L.latLng(this.lat(), this.lng());
    this.map.setView(center, this.map.getZoom(), { animate: false });
  }

  flyTo(lat: number, lng: number, zoom = this.zoom()): void {
    if (!this.map) {
      return;
    }
    const center = L.latLng(lat, lng);
    this.placeMarker(center);
    this.map.flyTo(center, zoom, { duration: 0.6 });
    const radius = this.radiusLabel()?.trim();
    this.selectedLabel.set(
      radius ? `${lat.toFixed(5)}, ${lng.toFixed(5)} · ${radius}` : `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    );
  }

  private static readonly DEFAULT_LAT = 13.7563;
  private static readonly DEFAULT_LNG = 100.5018;

  private initMap(): void {
    const center = L.latLng(this.lat(), this.lng());

    this.syncRadiusCaption();
    this.map = L.map(this.mapContainer.nativeElement, {
      center,
      zoom: this.zoom(),
      zoomControl: false,
      attributionControl: false,
      dragging: this.isDraggingEnabled(),
      scrollWheelZoom: this.isDraggingEnabled(),
      doubleClickZoom: this.isDraggingEnabled(),
      boxZoom: this.isDraggingEnabled(),
      keyboard: this.isDraggingEnabled(),
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(this.map);

    if (this.size() !== 'hero') {
      L.control
        .zoom({ zoomInTitle: 'ขยายแผนที่', zoomOutTitle: 'ย่อแผนที่' })
        .addTo(this.map);
    }

    this.placeMarker(center);
    if (
      this.showOverlay() &&
      Math.abs(this.lat() - MapView.DEFAULT_LAT) < 0.0001 &&
      Math.abs(this.lng() - MapView.DEFAULT_LNG) < 0.0001 &&
      this.selectable()
    ) {
      this.selectedLabel.set('ตำแหน่งเริ่มต้น — แตะแผนที่หรือค้นหาเพื่อปักหมุด');
    }

    if (this.selectable() && this.size() !== 'hero') {
      this.map.on('click', (event: L.LeafletMouseEvent) => {
        this.placeMarker(event.latlng);
        const radius = this.radiusLabel()?.trim();
        this.selectedLabel.set(
          radius
            ? `${event.latlng.lat.toFixed(5)}, ${event.latlng.lng.toFixed(5)} · ${radius}`
            : `${event.latlng.lat.toFixed(5)}, ${event.latlng.lng.toFixed(5)}`,
        );
        this.selected.emit({ lat: event.latlng.lat, lng: event.latlng.lng });
      });
    }

    setTimeout(() => this.refreshSize(), 0);
    setTimeout(() => this.refreshSize(), 350);
  }

  private placeMarker(position: L.LatLng): void {
    const radiusMeters = this.radiusMeters();

    if (!this.map) {
      return;
    }

    if (!this.marker) {
      this.marker = L.marker(position, { icon: markerIcon, alt: 'ตำแหน่งบนแผนที่', title: 'ตำแหน่งบนแผนที่', keyboard: false }).addTo(this.map);
    } else {
      this.marker.setLatLng(position);
    }

    if (!this.circle) {
      this.circle = L.circle(position, {
        radius: radiusMeters,
        color: '#0a9f50',
        weight: 2,
        fillColor: '#0a9f50',
        fillOpacity: 0.08,
      }).addTo(this.map);
    } else {
      this.circle.setLatLng(position);
      this.circle.setRadius(radiusMeters);
    }
  }

  private syncRadiusCaption(): void {
    const km = this.radiusKm();
    if (km != null && km > 0) {
      this.selectedLabel.set(`รัศมี ${km} กม.`);
      return;
    }
    const label = this.radiusLabel()?.trim();
    if (label) {
      this.selectedLabel.set(label);
    }
  }

  private radiusMeters(): number {
    const km = this.radiusKm();
    if (km != null && km > 0) {
      return km * 1000;
    }
    const kmMatch = this.radiusLabel().match(/(\d+(?:\.\d+)?)\s*กม/);
    if (kmMatch?.[1]) {
      return Number(kmMatch[1]) * 1000;
    }
    return 5000;
  }

  private isDraggingEnabled(): boolean {
    return this.dragging() && this.size() !== 'hero';
  }

  private syncDragging(): void {
    if (!this.map) {
      return;
    }

    const enabled = this.isDraggingEnabled();
    if (enabled) {
      this.map.dragging.enable();
      this.map.scrollWheelZoom.enable();
      this.map.doubleClickZoom.enable();
      this.map.boxZoom.enable();
      this.map.keyboard.enable();
      return;
    }

    this.map.dragging.disable();
    this.map.scrollWheelZoom.disable();
    this.map.doubleClickZoom.disable();
    this.map.boxZoom.disable();
    this.map.keyboard.disable();
  }
}
