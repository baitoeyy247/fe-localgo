import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MapView } from '../../demo/map-view';
import { PageShell } from '../../demo/page-shell';
import { AuthService } from '../../core/auth.service';
import { LocalGoApiService } from '../../core/localgo-api.service';
import { Category } from '../../core/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-entry-page',
  imports: [PageShell, MapView],
  templateUrl: './entry.html',
})
export class EntryPage implements OnInit {
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly categories = signal<Category[]>([]);
  protected readonly lineHint = signal<string | null>(null);
  protected readonly allowDevLogin = environment.allowDevLogin;
  protected readonly auth = inject(AuthService);
  private readonly api = inject(LocalGoApiService);
  private readonly router = inject(Router);
  private static readonly DEFAULT_AUTH_ERROR = 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';

  protected liffEntryUrl(): string {
    return this.auth.liffEntryUrl();
  }

  async ngOnInit(): Promise<void> {
    await this.bootstrapEntry();
  }

  protected async retryLogin(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.auth.clearSession();
      this.auth.resetBootstrap();
      await this.auth.ensureSession();
      await this.loadCategories();
      await this.loadLineHint();
    } catch (e) {
      this.error.set(this.toAuthErrorMessage(e));
      await this.loadLineHint();
    } finally {
      this.loading.set(false);
    }
  }

  protected async logout(): Promise<void> {
    this.auth.clearSession();
    this.auth.resetBootstrap();
    this.error.set(null);
    this.categories.set([]);
    await this.loadLineHint();
  }

  private async bootstrapEntry(): Promise<void> {
    try {
      this.auth.resetBootstrap();
      await this.auth.ensureSession();
      await this.loadCategories();
      await this.loadLineHint();
    } catch (e) {
      this.error.set(this.toAuthErrorMessage(e));
      console.error('[LocalGo auth]', e);
      await this.loadLineHint();
    } finally {
      this.loading.set(false);
    }
  }

  private async loadCategories(): Promise<void> {
    try {
      const cats = await firstValueFrom(this.api.listCategories());
      this.categories.set(cats);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'โหลดหมวดบริการไม่สำเร็จ');
      console.error('[LocalGo categories]', e);
    }
  }

  private async loadLineHint(): Promise<void> {
    const host = window.location.hostname;
    if (this.isLocalDevHost(host)) {
      return;
    }
    try {
      const cfg = await firstValueFrom(this.api.getLineConfig());
      const expected = cfg.expectedWebOrigin;
      const current = `${window.location.origin}/`;
      const liffId = cfg.liffId?.trim();
      if (!liffId) {
        this.lineHint.set(
          'LIFF ต้องสร้างบน Channel 2010177046 — ใส่ LIFF ID ใน appsettings.Development.json และ environment.ts',
        );
      } else if (expected && expected !== current) {
        this.lineHint.set(
          `URL ปัจจุบัน (${current}) ไม่ตรงกับที่ตั้งในเซิร์ฟเวอร์ (${expected}) — อัปเดต LIFF Endpoint ใน LINE Console`,
        );
      } else if (expected) {
        this.lineHint.set(`LIFF Endpoint ใน LINE Console ต้องเป็น: ${expected}`);
      }
    } catch {
      this.lineHint.set(
        'ตรวจว่า FE (4200), API (5080) และ ngrok http 4200 รันอยู่ แล้วเปิดจากลิงก์ LIFF ไม่ใช่ localhost',
      );
    }
  }

  private isLocalDevHost(host: string): boolean {
    return (
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)
    );
  }

  protected async enterAs(role: 'Requester' | 'Provider'): Promise<void> {
    await this.auth.setActiveRole(role);
    await this.router.navigateByUrl(role === 'Requester' ? '/requester' : '/provider');
  }

  protected async enterAdmin(): Promise<void> {
    await this.auth.loginAsAdmin();
    await this.router.navigateByUrl('/admin');
  }

  protected async useDevLogin(): Promise<void> {
    this.loading.set(true);
    try {
      await this.auth.devLogin();
      this.error.set(null);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Dev login failed');
    } finally {
      this.loading.set(false);
    }
  }

  protected async searchCategory(cat: Category): Promise<void> {
    await this.auth.setActiveRole('Requester');
    await this.router.navigate(['/requester/search'], { queryParams: { categoryId: cat.id, categoryName: cat.name } });
  }

  private toAuthErrorMessage(error: unknown): string {
    const raw = error instanceof Error ? error.message : EntryPage.DEFAULT_AUTH_ERROR;
    const normalized = raw.toLowerCase();
    if (normalized.includes('idtoken expired') || normalized.includes('invalid line token')) {
      return 'เซสชัน LINE หมดอายุ กรุณาแตะ "เข้าสู่ระบบใหม่" เพื่อเข้าใช้งานต่อ';
    }
    if (normalized.includes('line') && normalized.includes('หมดอายุ')) {
      return raw;
    }
    if (raw.trim().startsWith('{') || raw.includes('"detail"')) {
      return EntryPage.DEFAULT_AUTH_ERROR;
    }
    return raw || EntryPage.DEFAULT_AUTH_ERROR;
  }
}
