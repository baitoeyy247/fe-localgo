import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import liff from '@line/liff';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { apiErrorMessage } from './api-error.util';
import { UserProfile } from './models';
import { LocalGoApiService } from './localgo-api.service';
import { MarketplaceCacheService } from './marketplace-cache.service';
import { UserLocationService } from './user-location.service';
import { SessionStateService } from './session-state.service';
import { SessionProfileCacheService } from './session-profile-cache.service';

const TOKEN_KEY = 'localgo_access_token';
const USER_KEY = 'localgo_user';
const AUTH_MODE_KEY = 'localgo_auth_mode';
const PERSONA_KEY = 'localgo_persona_key';
const LINE_RELOGIN_GUARD_KEY = 'localgo_line_relogin_guard';
const LINE_RELOGIN_GUARD_WINDOW_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenSignal = signal<string | null>(this.readToken());
  private readonly userSignal = signal<UserProfile | null>(this.readUser());
  private bootstrapPromise: Promise<void> | null = null;

  readonly accessToken = computed(() => this.tokenSignal());
  readonly user = computed(() => this.userSignal());
  readonly isAuthenticated = computed(() => !!this.tokenSignal());
  readonly isAdmin = computed(() => this.userSignal()?.systemRole === 'Admin');
  readonly activeRole = computed(() => this.userSignal()?.activeRole ?? null);
  readonly isLineClient = signal(false);
  readonly authMode = signal<'none' | 'line' | 'dev'>(
    (sessionStorage.getItem(AUTH_MODE_KEY) as 'line' | 'dev' | null) ?? 'none',
  );

  private readonly api = inject(LocalGoApiService);
  private readonly locations = inject(UserLocationService);
  private readonly cache = inject(MarketplaceCacheService);
  private readonly session = inject(SessionStateService);
  private readonly meCache = inject(SessionProfileCacheService);

  ensureSession(): Promise<void> {
    this.bootstrapPromise ??= this.bootstrap();
    return this.bootstrapPromise;
  }

  /** Non-blocking refresh after routes already have a cached user (L-5). */
  refreshSessionInBackground(): void {
    if (!this.tokenSignal()) {
      return;
    }
    void firstValueFrom(this.meCache.getMe())
      .then((me) => {
        this.userSignal.set(me);
        this.meCache.patch(me);
        sessionStorage.setItem(USER_KEY, JSON.stringify(me));
      })
      .catch(() => undefined);
  }

  resetBootstrap(): void {
    this.bootstrapPromise = null;
  }

  private resolvedLiffId: string | null = null;

  async bootstrap(): Promise<void> {
    const allowTestLogin = environment.allowDevLogin && this.canUseTestLogin();

    // LINE / production hosts — clear leftover Dev tokens, then LIFF
    if (!allowTestLogin) {
      if (sessionStorage.getItem(AUTH_MODE_KEY) !== 'line') {
        this.clearSession();
      }
      await this.bootstrapWithLiff();
      return;
    }

    if (this.tokenSignal()) {
      const stored = this.userSignal();
      if (stored) {
        this.meCache.seed(stored);
        this.refreshSessionInBackground();
        return;
      }
      try {
        const me = await firstValueFrom(this.meCache.getMe(true));
        const mode = sessionStorage.getItem(AUTH_MODE_KEY);
        this.setSession(this.tokenSignal()!, me, mode === 'line' ? 'line' : 'dev');
        return;
      } catch {
        this.clearSession();
      }
    }

    // SIT/test: wait for persona picker on entry (do not auto-create a throwaway user).
    // Localhost: keep one-click convenience with the default display name.
    if (this.isLocalDevHost()) {
      await this.devLogin();
    }
  }

  private async bootstrapWithLiff(): Promise<void> {
    const liffId = await this.resolveLiffId();
    if (!liffId) {
      throw new Error(
        'ยังไม่ได้ตั้ง LIFF ID — LIFF ต้องสร้างบน Channel 2010177046 แล้วใส่ใน appsettings และ environment.ts',
      );
    }

    try {
      await liff.init({ liffId });
      this.isLineClient.set(liff.isInClient());
    } catch (e) {
      if (environment.allowDevLogin && this.canUseTestLogin()) {
        // Let entry show test personas / Dev login instead of hard-failing LIFF.
        return;
      }
      throw this.toAuthError(e, 'ไม่สามารถเริ่ม LIFF ได้ — ตรวจ Endpoint URL ใน LINE Console (ต้องเป็น ngrok HTTPS)');
    }

    if (!liff.isLoggedIn()) {
      this.authMode.set('none');
      liff.login({ redirectUri: this.liffRedirectUri() });
      return;
    }

    const idToken = liff.getIDToken();
    if (!idToken) {
      throw new Error('ไม่ได้รับ LINE id token — ลองปิดแล้วเปิดลิงก์ LIFF ใหม่');
    }

    await this.completeLineLogin(idToken);
    this.authMode.set('line');
  }

  private liffRedirectUri(): string {
    const { origin, pathname, search } = window.location;
    return `${origin}${pathname}${search}`;
  }

  private async completeLineLogin(idToken: string): Promise<void> {
    let response;
    try {
      response = await firstValueFrom(this.api.lineLogin(idToken));
    } catch (e) {
      const detail = apiErrorMessage(e, 'ยืนยันตัวตน LINE กับเซิร์ฟเวอร์ไม่สำเร็จ');
      if (this.isLineTokenExpiredError(detail)) {
        this.clearSession();
        this.resetBootstrap();
        if (this.canAutoRelogin()) {
          try {
            if (liff.isLoggedIn()) {
              liff.logout();
            }
          } catch {
            // fallback to login redirect below
          }
          liff.login({ redirectUri: this.liffRedirectUri() });
          throw new Error('กำลังพาไปเข้าสู่ระบบ LINE ใหม่...');
        }
        throw new Error('เซสชัน LINE หมดอายุ กรุณากด "เข้าสู่ระบบใหม่" เพื่อยืนยันตัวตนอีกครั้ง');
      }
      throw new Error(detail);
    }
    // ตั้ง token ก่อน acceptPrivacy — interceptor ต้องใช้ JWT
    sessionStorage.setItem(TOKEN_KEY, response.accessToken);
    this.tokenSignal.set(response.accessToken);

    let user = response.user;
    if (!user.privacyNoticeAccepted) {
      user = await firstValueFrom(this.api.acceptPrivacy(environment.privacyVersion));
    }
    this.setSession(response.accessToken, user, 'line');
    this.clearReloginGuard();
  }

  async devLogin(options?: {
    displayName?: string;
    activeRole?: 'Requester' | 'Provider';
    asAdmin?: boolean;
    personaKey?: string;
  }): Promise<void> {
    const previousPersona = sessionStorage.getItem(PERSONA_KEY);
    const nextPersona = options?.personaKey ?? null;
    const personaChanged = nextPersona !== previousPersona;
    if (personaChanged) {
      this.locations.clear();
      this.session.clearRequesterFlow();
      this.session.clearProviderRequest();
      this.cache.invalidateAll();
    }
    const response = await firstValueFrom(
      this.api.devLogin({
        displayName: options?.displayName ?? (environment.devLoginDisplayName || 'Dev User'),
        activeRole: options?.activeRole ?? 'Requester',
        asAdmin: options?.asAdmin ?? false,
        personaKey: options?.personaKey,
      }),
    );
    if (options?.personaKey) {
      sessionStorage.setItem(PERSONA_KEY, options.personaKey);
    } else {
      sessionStorage.removeItem(PERSONA_KEY);
    }
    this.setSession(response.accessToken, response.user, 'dev');
    this.locations.reloadFromStorage(options?.personaKey ?? null);
  }

  /** Ping API after role switch to reduce cold-start wait on first screen. */
  warmApi(): void {
    this.cache.preloadHome(this.userSignal()?.activeRole ?? null);
  }

  /** Dev/SIT personas — may skip appointment start-window UX for playtesting. */
  isTestPersona(): boolean {
    if (this.authMode() !== 'dev') {
      return false;
    }
    return !!sessionStorage.getItem(PERSONA_KEY);
  }

  /** Localhost / LAN, or temporary SIT playtest hosts (Pages). */
  canUseTestLogin(): boolean {
    if (!environment.allowDevLogin) {
      return false;
    }
    return this.isLocalDevHost() || this.isSitPlaytestHost();
  }

  liffEntryUrl(): string {
    const liffId = this.resolvedLiffId ?? environment.liffId;
    return liffId ? `https://liff.line.me/${liffId}/` : '(สร้าง LIFF บน Channel 2010177046 ก่อน)';
  }

  private async resolveLiffId(): Promise<string | null> {
    if (this.resolvedLiffId) {
      return this.resolvedLiffId;
    }
    try {
      const cfg = await firstValueFrom(this.api.getLineConfig());
      const fromApi = cfg.liffId?.trim();
      if (fromApi) {
        this.resolvedLiffId = fromApi;
        return fromApi;
      }
    } catch {
      // fallback to environment
    }
    const fromEnv = environment.liffId?.trim();
    if (fromEnv) {
      this.resolvedLiffId = fromEnv;
      return fromEnv;
    }
    return null;
  }

  async setActiveRole(role: 'Requester' | 'Provider'): Promise<UserProfile> {
    if (!this.tokenSignal()) {
      throw new Error('ยังไม่ได้เข้าสู่ระบบ');
    }
    const updated = await firstValueFrom(this.api.updateActiveRole(role));
    this.userSignal.set(updated);
    this.meCache.patch(updated);
    sessionStorage.setItem(USER_KEY, JSON.stringify(updated));
    return updated;
  }

  setSession(
    token: string,
    user: UserProfile,
    mode: 'line' | 'dev',
    options?: { skipWarm?: boolean },
  ): void {
    this.tokenSignal.set(token);
    this.userSignal.set(user);
    this.meCache.seed(user);
    this.authMode.set(mode);
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    sessionStorage.setItem(AUTH_MODE_KEY, mode);
    if (!options?.skipWarm) {
      this.cache.preloadHome(user.activeRole ?? null);
    }
  }

  async loginAsAdmin(): Promise<void> {
    await this.devLogin({
      displayName: 'ทดสอบ แอดมิน',
      activeRole: 'Requester',
      asAdmin: true,
      personaKey: 'admin-01',
    });
  }

  clearSession(): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    this.authMode.set('none');
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(PERSONA_KEY);
    sessionStorage.removeItem(AUTH_MODE_KEY);
    this.locations.forgetSessionCache();
    this.session.clearRequesterFlow();
    this.session.clearProviderRequest();
    this.cache.invalidateAll();
    this.meCache.clear();
  }

  private isLocalDevHost(): boolean {
    const host = window.location.hostname;
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

  private isSitPlaytestHost(): boolean {
    const host = window.location.hostname;
    return (
      host === 'localgo-sit-616.pages.dev' ||
      host.endsWith('.localgo-sit-616.pages.dev') ||
      host === 'localgo-sit.pages.dev'
    );
  }

  private toAuthError(err: unknown, fallback: string): Error {
    const detail = apiErrorMessage(err, '');
    if (detail) {
      return new Error(`${fallback}: ${detail}`);
    }
    if (err instanceof Error && err.message) {
      return new Error(`${fallback}: ${err.message}`);
    }
    return new Error(fallback);
  }

  private readToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  private readUser(): UserProfile | null {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as UserProfile;
    } catch {
      return null;
    }
  }

  private isLineTokenExpiredError(detail: string): boolean {
    const normalized = detail.toLowerCase();
    return normalized.includes('idtoken expired') || normalized.includes('invalid line token');
  }

  private canAutoRelogin(): boolean {
    const lastAttemptRaw = sessionStorage.getItem(LINE_RELOGIN_GUARD_KEY);
    const lastAttempt = lastAttemptRaw ? Number(lastAttemptRaw) : 0;
    const now = Date.now();
    if (Number.isFinite(lastAttempt) && now - lastAttempt < LINE_RELOGIN_GUARD_WINDOW_MS) {
      return false;
    }
    sessionStorage.setItem(LINE_RELOGIN_GUARD_KEY, String(now));
    return true;
  }

  private clearReloginGuard(): void {
    sessionStorage.removeItem(LINE_RELOGIN_GUARD_KEY);
  }
}
