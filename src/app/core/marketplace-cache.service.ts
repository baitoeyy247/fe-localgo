import { Injectable, inject } from '@angular/core';
import { Observable, of, tap, shareReplay, catchError } from 'rxjs';
import { LocalGoApiService } from './localgo-api.service';
import { ProviderBranch, ProviderDetail, ServiceRequestSummary } from './models';
import { mergeBranchIntoProvider, removeBranchFromProvider } from './marketplace-provider-branches.util';

type CacheEntry<T> = { at: number; data: T; stream$: Observable<T> };

/** Lightweight SWR-style cache for home / matching lists. */
@Injectable({ providedIn: 'root' })
export class MarketplaceCacheService {
  private readonly api = inject(LocalGoApiService);
  /** Session-scoped — invalidated on logout / persona switch / admin reset. */
  private readonly ttlMs = 24 * 60 * 60 * 1000;
  private myRequests: CacheEntry<ServiceRequestSummary[]> | null = null;
  private matching: CacheEntry<ServiceRequestSummary[]> | null = null;
  private myProvider: CacheEntry<ProviderDetail> | null = null;

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

  /** Warm home data after login / persona switch (role-aware — skip matching on requester-only). */
  preloadHome(activeRole?: string | null): void {
    if (activeRole === 'Provider') {
      this.getMyProvider().subscribe({ error: () => undefined });
      this.refreshMatching().subscribe({ error: () => undefined });
      return;
    }
    if (activeRole === 'Requester') {
      this.refreshMyRequests().subscribe({ error: () => undefined });
      return;
    }
    this.refreshMyRequests().subscribe({ error: () => undefined });
    this.getMyProvider().subscribe({ error: () => undefined });
  }

  invalidateMyRequests(): void {
    this.myRequests = null;
  }

  invalidateMatching(): void {
    this.matching = null;
  }

  invalidateMyProvider(): void {
    this.myProvider = null;
  }

  /** Keep provider cache in sync after branch PATCH/POST (M-4 — avoid stale GET /me). */
  applyBranchUpdate(branch: ProviderBranch): void {
    if (!this.myProvider) {
      return;
    }
    this.myProvider = {
      at: Date.now(),
      data: mergeBranchIntoProvider(this.myProvider.data, branch),
      stream$: this.myProvider.stream$,
    };
  }

  removeBranchFromCache(branchId: string): void {
    if (!this.myProvider) {
      return;
    }
    this.myProvider = {
      at: Date.now(),
      data: removeBranchFromProvider(this.myProvider.data, branchId),
      stream$: this.myProvider.stream$,
    };
  }

  invalidateAll(): void {
    this.myRequests = null;
    this.matching = null;
    this.myProvider = null;
  }

  /** Cached provider profile for the logged-in provider user. */
  getMyProvider(force = false): Observable<ProviderDetail> {
    const now = Date.now();
    if (!force && this.myProvider && now - this.myProvider.at < this.ttlMs) {
      return of(this.myProvider.data);
    }
    const stream$ = this.api.getMyProvider().pipe(
      tap((data) => {
        this.myProvider = { at: Date.now(), data, stream$ };
      }),
      shareReplay(1),
    );
    return stream$;
  }

  private refreshMyRequests(): Observable<ServiceRequestSummary[]> {
    const previous = this.myRequests;
    const stream$ = this.api.listMyRequests().pipe(
      tap((data) => {
        this.myRequests = { at: Date.now(), data, stream$ };
      }),
      catchError((err) => {
        // A5-1: never mask a failed GET as an empty list; restore the last good entry and rethrow.
        this.myRequests = previous && previous.at > 0 ? previous : null;
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
    const previous = this.matching;
    const stream$ = this.api.listMatchingRequests(true).pipe(
      tap((data) => {
        this.matching = { at: Date.now(), data, stream$ };
      }),
      catchError((err) => {
        // A5-1: never mask a failed GET as an empty list; restore the last good entry and rethrow.
        this.matching = previous && previous.at > 0 ? previous : null;
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
