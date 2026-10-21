import { Component, OnDestroy, OnInit, signal } from '@angular/core';

@Component({
  selector: 'app-offline-bar',
  template: `
    @if (offline()) {
      <div class="offline" role="status">📡 ออฟไลน์อยู่ — ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต</div>
    }
  `,
})
export class OfflineBar implements OnInit, OnDestroy {
  protected readonly offline = signal(false);

  private readonly onOnline = () => this.offline.set(false);
  private readonly onOffline = () => this.offline.set(true);

  ngOnInit(): void {
    if (typeof window === 'undefined') {
      return;
    }
    this.offline.set(typeof navigator !== 'undefined' && navigator.onLine === false);
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
  }

  ngOnDestroy(): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
  }
}
