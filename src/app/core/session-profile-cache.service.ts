import { Injectable, inject } from '@angular/core';
import { Observable, of, shareReplay, tap } from 'rxjs';
import { LocalGoApiService } from './localgo-api.service';
import { UserProfile } from './models';

/** In-session cache for GET /me — avoids blocking every route on a refetch (QA28 L-5). */
@Injectable({ providedIn: 'root' })
export class SessionProfileCacheService {
  private readonly api = inject(LocalGoApiService);
  private cached: UserProfile | null = null;
  private inflight: Observable<UserProfile> | null = null;

  seed(profile: UserProfile | null): void {
    this.cached = profile;
    this.inflight = null;
  }

  clear(): void {
    this.cached = null;
    this.inflight = null;
  }

  /** Cached profile for this browser session; optional background refresh. */
  getMe(force = false): Observable<UserProfile> {
    if (!force && this.cached) {
      return of(this.cached);
    }
    if (!force && this.inflight) {
      return this.inflight;
    }
    const stream$ = this.api.getMe().pipe(
      tap((profile) => {
        this.cached = profile;
        this.inflight = null;
      }),
      shareReplay(1),
    );
    this.inflight = stream$;
    return stream$;
  }

  patch(profile: UserProfile): void {
    this.cached = profile;
  }
}
