import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PageShell } from '../../demo/page-shell';
import { AuthService } from '../../core/auth.service';
import { LocalGoApiService } from '../../core/localgo-api.service';
import { Category } from '../../core/models';
import { TEST_PERSONAS, TestPersona } from '../../core/test-personas';
import { apiErrorMessage } from '../../core/api-error.util';
import { HttpErrorResponse } from '@angular/common/http';
import { SlowLoadHint } from '../../shared/load-state';
import { ENTRY_SESSION_TIMEOUT_MS } from './entry.constants';

@Component({
  selector: 'app-entry-page',
  imports: [PageShell],
  templateUrl: './entry.html',
})
export class EntryPage implements OnInit, OnDestroy {
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly categories = signal<Category[]>([]);
  protected readonly lineHint = signal<string | null>(null);
  protected readonly personaBusy = signal(false);
  protected readonly activePersonaKey = signal<string | null>(null);
  protected readonly roleBusy = signal<'Requester' | 'Provider' | null>(null);
  protected readonly personas = TEST_PERSONAS;
  protected readonly auth = inject(AuthService);
  protected readonly hint = new SlowLoadHint();
  private readonly api = inject(LocalGoApiService);
  private readonly router = inject(Router);
  private static readonly DEFAULT_AUTH_ERROR = 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';

  protected showTestMode(): boolean {
    return this.auth.canUseTestLogin();
  }

  protected liffEntryUrl(): string {
    return this.auth.liffEntryUrl();
  }

  async ngOnInit(): Promise<void> {
    await this.bootstrapEntry();
  }

  ngOnDestroy(): void {
    this.hint.end();
  }

  protected async retryLogin(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.hint.begin();
    try {
      this.auth.clearSession();
      this.auth.resetBootstrap();
      await this.ensureSessionWithTimeout();
      await this.loadCategories();
      await this.loadLineHint();
    } catch (e) {
      this.error.set(this.toAuthErrorMessage(e));
      await this.loadLineHint();
    } finally {
      this.hint.end();
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

  protected async loginAsPersona(persona: TestPersona): Promise<void> {
    if (this.personaBusy()) {
      return;
    }
    this.activePersonaKey.set(persona.key);
    this.personaBusy.set(true);
    this.error.set(null);
    this.hint.begin();
    try {
      await this.auth.devLogin({
        displayName: persona.displayName,
        activeRole: persona.activeRole,
        asAdmin: persona.asAdmin === true,
        personaKey: persona.key,
      });
      await this.loadCategories();
    } catch (e) {
      this.error.set(apiErrorMessage(e, 'เข้าบัญชีทดสอบไม่สำเร็จ'));
    } finally {
      this.hint.end();
      this.personaBusy.set(false);
      this.activePersonaKey.set(null);
    }
  }

  private async bootstrapEntry(): Promise<void> {
    if (this.showTestMode() && !this.auth.isAuthenticated()) {
      void this.loadLineHint();
      this.loading.set(false);
      return;
    }

    this.hint.begin();
    try {
      this.auth.resetBootstrap();
      await this.ensureSessionWithTimeout();
      if (this.auth.isAuthenticated()) {
        await this.loadCategories();
      }
      await this.loadLineHint();
    } catch (e) {
      // On SIT test mode, LIFF may fail — still show persona picker.
      if (!this.showTestMode()) {
        this.error.set(this.toAuthErrorMessage(e));
      }
      console.error('[LocalGo auth]', e);
      await this.loadLineHint();
    } finally {
      this.hint.end();
      this.loading.set(false);
    }
  }

  private async loadCategories(): Promise<void> {
    try {
      const cats = await firstValueFrom(this.api.listCategories());
      this.categories.set(cats);
    } catch (e) {
      console.error('[LocalGo categories]', e);
    }
  }

  private async loadLineHint(): Promise<void> {
    if (this.showTestMode()) {
      return;
    }
    try {
      const cfg = await firstValueFrom(this.api.getLineConfig());
      const expected = cfg.expectedWebOrigin;
      const current = `${window.location.origin}/`;
      const liffId = cfg.liffId?.trim();
      if (!liffId) {
        this.lineHint.set(
          'LIFF ต้องสร้างบน Channel 2010177240 — ใส่ LIFF ID ใน appsettings และ environment',
        );
      } else if (expected && expected !== current) {
        this.lineHint.set(
          `URL ปัจจุบัน (${current}) ไม่ตรงกับที่ตั้งในเซิร์ฟเวอร์ (${expected}) — อัปเดต LIFF Endpoint ใน LINE Console`,
        );
      } else if (expected) {
        this.lineHint.set(`LIFF Endpoint ใน LINE Console ต้องเป็น: ${expected}`);
      }
    } catch {
      /* ignore */
    }
  }

  protected async enterAs(role: 'Requester' | 'Provider'): Promise<void> {
    if (this.roleBusy()) {
      return;
    }
    this.roleBusy.set(role);
    try {
      await this.auth.setActiveRole(role);
      this.auth.warmApi();
      await this.router.navigateByUrl(role === 'Requester' ? '/requester' : '/provider');
    } finally {
      this.roleBusy.set(null);
    }
  }

  protected async goAdmin(): Promise<void> {
    await this.router.navigateByUrl('/admin');
  }

  protected async enterAdmin(): Promise<void> {
    if (!this.showTestMode()) {
      return;
    }
    await this.auth.loginAsAdmin();
    await this.router.navigateByUrl('/admin');
  }

  protected async searchCategory(cat: Category): Promise<void> {
    await this.auth.setActiveRole('Requester');
    await this.router.navigate(['/requester/search'], {
      queryParams: { categoryId: cat.id, categoryName: cat.name },
    });
  }

  /** Exported for tests — entry session bootstrap timeout. */
  static readonly SESSION_TIMEOUT_MS = ENTRY_SESSION_TIMEOUT_MS;

  private async ensureSessionWithTimeout(): Promise<void> {
    try {
      await Promise.race([
        this.auth.ensureSession(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('การเชื่อมต่อใช้เวลานานเกินไป — กรุณาลองใหม่')),
            EntryPage.SESSION_TIMEOUT_MS,
          ),
        ),
      ]);
    } catch (e) {
      this.auth.clearSession();
      this.auth.resetBootstrap();
      throw e;
    }
  }

  private toAuthErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse || (error && typeof error === 'object' && 'status' in error)) {
      return apiErrorMessage(error, EntryPage.DEFAULT_AUTH_ERROR);
    }
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
