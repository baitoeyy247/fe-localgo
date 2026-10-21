import { Injectable, inject } from '@angular/core';
import { Observable, of, tap, shareReplay, catchError } from 'rxjs';
import { LocalGoApiService } from './localgo-api.service';
import { ServiceRequestSummary } from './models';

type CacheEntry<T> = { at: number; data: T; stream$: Observable<T> };

/** Lightweight SWR-style cache for home / matching lists. */
@Injectable({ providedIn: 'root' })
export class MarketplaceCacheService {
  private readonly api = inject(LocalGoApiService);
  private readonly ttlMs = 45_000;
  private myRequests: CacheEntry<ServiceRequestSummary[]> | null = null;
  private matching: CacheEntry<ServiceRequestSummary[]> | null = null;

  /** Stale-while-revalidate for requester home. */
  listMyRequests(force = false): Observable<ServiceRequestSummary[]> {
    const now = Date.now();
    if (!force && this.myRequests && now - this.myRequests.at < this.ttlMs) {
      // Background refresh if older than half TTL.
      if (now - this.myRequests.at > this.ttlMs / 2) {
        this.refreshMyRequests();
      }
      return of(this.myRequests.data);
    }
    return this.refreshMyRequests();
  }

  listMatchingRequests(force = false): Observable<ServiceRequestSummary[]> {
    const now = Date.now();
    if (!force && this.matching && now - this.matching.at < this.ttlMs) {
      if (now - this.matching.at > this.ttlMs / 2) {
        this.refreshMatching();
      }
      return of(this.matching.data);
    }
    return this.refreshMatching();
  }

  /** Warm home data after login / persona switch. */
  preloadHome(): void {
    this.refreshMyRequests().subscribe({ error: () => undefined });
    this.refreshMatching().subscribe({ error: () => undefined });
  }

  invalidateMyRequests(): void {
    this.myRequests = null;
  }

  invalidateMatching(): void {
    this.matching = null;
  }

  invalidateAll(): void {
    this.myRequests = null;
    this.matching = null;
  }

  private refreshMyRequests(): Observable<ServiceRequestSummary[]> {
    const stream$ = this.api.listMyRequests().pipe(
      tap((data) => {
        this.myRequests = { at: Date.now(), data, stream$ };
      }),
      catchError((err) => {
        if (this.myRequests) {
          return of(this.myRequests.data);
        }
        throw err;
      }),
      shareReplay(1),
    );
    this.myRequests = {
      at: this.myRequests?.at ?? 0,
      data: this.myRequests?.data ?? [],
      stream$,
    };
    return stream$;
  }

  private refreshMatching(): Observable<ServiceRequestSummary[]> {
    const stream$ = this.api.listMatchingRequests(true).pipe(
      tap((data) => {
        this.matching = { at: Date.now(), data, stream$ };
      }),
      catchError((err) => {
        if (this.matching) {
          return of(this.matching.data);
        }
        throw err;
      }),
      shareReplay(1),
    );
    this.matching = {
      at: this.matching?.at ?? 0,
      data: this.matching?.data ?? [],
      stream$,
    };
    return stream$;
  }
}
