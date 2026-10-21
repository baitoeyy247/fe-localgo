import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AdminDashboard,
  AdminNotificationRow,
  AdminUserRow,
  AppointmentDetail,
  AuthResponse,
  BidItem,
  BookProviderResult,
  Category,
  CreatedResource,
  LineConfig,
  ProviderBranch,
  BidFormAccess,
  ProviderDetail,
  ProviderBidListItem,
  ProviderHomeSummary,
  ProviderMatchingInbox,
  ProviderService,
  ProviderSummary,
  ReviewItem,
  ServiceRequestDetail,
  ServiceRequestSummary,
  UserProfile,
} from './models';

type HttpErrorLike = { status?: number };

@Injectable({ providedIn: 'root' })
export class LocalGoApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl.replace(/\/$/, '');
  private providerEpoch = 0;
  private providerCache: ProviderDetail | null = null;
  private providerRequest: Observable<ProviderDetail> | null = null;
  private categoryCache: Category[] | null = null;
  private categoryRequest: Observable<Category[]> | null = null;

  // --- Auth & profile ---

  lineLogin(lineIdToken: string): Observable<AuthResponse> {
    return this.post<AuthResponse>('/auth/line/login', { lineIdToken });
  }

  devLogin(body: {
    displayName?: string;
    activeRole?: string;
    asAdmin?: boolean;
  }): Observable<AuthResponse> {
    return this.post<AuthResponse>('/auth/dev/login', body);
  }

  getMe(): Observable<UserProfile> {
    return this.get<UserProfile>('/me');
  }

  updateActiveRole(activeRole: string): Observable<UserProfile> {
    return this.patch<UserProfile>('/me/active-role', { activeRole });
  }

  acceptPrivacy(version: string): Observable<UserProfile> {
    return this.post<UserProfile>('/me/accept-privacy-notice', { version });
  }

  // --- Catalog & config ---

  listCategories(): Observable<Category[]> {
    if (this.categoryCache) {
      return of(this.categoryCache);
    }
    this.categoryRequest ??= this.get<Category[]>('/categories').pipe(
      tap((items) => {
        this.categoryCache = items;
      }),
      catchError((err) => {
        this.categoryRequest = null;
        return throwError(() => err);
      }),
      shareReplay(1),
    );
    return this.categoryRequest;
  }

  getLineConfig(): Observable<LineConfig> {
    return this.get<LineConfig>('/config/line');
  }

  searchProviders(params: {
    lat: number;
    lng: number;
    radiusMeters?: number;
    categoryId?: string;
    keyword?: string;
    minRating?: number;
  }): Observable<ProviderSummary[]> {
    const q = new URLSearchParams({
      lat: String(params.lat),
      lng: String(params.lng),
      radiusMeters: String(params.radiusMeters ?? 5000),
    });
    if (params.categoryId) {
      q.set('categoryId', params.categoryId);
    }
    if (params.keyword) {
      q.set('keyword', params.keyword);
    }
    if (params.minRating != null) {
      q.set('minRating', String(params.minRating));
    }
    return this.get<ProviderSummary[]>(`/search/providers?${q}`);
  }

  // --- Provider profile, branches, services ---

  getProvider(providerId: string): Observable<ProviderDetail> {
    return this.get<ProviderDetail>(`/providers/${providerId}`);
  }

  getMyProvider(): Observable<ProviderDetail> {
    if (this.providerCache) {
      return of(this.providerCache);
    }
    if (!this.providerRequest) {
      const epoch = this.providerEpoch;
      this.providerRequest = this.get<ProviderDetail>('/providers/me').pipe(
        tap((mine) => {
          if (epoch === this.providerEpoch) {
            this.providerCache = mine;
          }
        }),
        catchError((err) => {
          if (epoch === this.providerEpoch) {
            this.providerRequest = null;
          }
          return throwError(() => err);
        }),
        shareReplay(1),
      );
    }
    return this.providerRequest;
  }

  createProvider(body: {
    providerType: string;
    name: string;
    description?: string;
    contactLineId?: string;
    contactPhone?: string;
    contactUrl?: string;
  }): Observable<ProviderDetail> {
    this.forgetProvider();
    return this.post<ProviderDetail>('/providers', body);
  }

  updateProvider(
    providerId: string,
    body: {
      name?: string;
      description?: string;
      contactLineId?: string;
      contactPhone?: string;
      contactUrl?: string;
    },
  ): Observable<ProviderDetail> {
    this.forgetProvider();
    return this.patch<ProviderDetail>(`/providers/${providerId}`, body);
  }

  addBranch(
    providerId: string,
    body: {
      name: string;
      addressText?: string;
      latitude: number;
      longitude: number;
      serviceRadiusMeters: number;
      isActive?: boolean;
    },
  ): Observable<ProviderBranch> {
    this.forgetProvider();
    return this.post<ProviderBranch>(`/providers/${providerId}/branches`, body);
  }

  deleteBranch(providerId: string, branchId: string): Observable<void> {
    this.forgetProvider();
    return this.http.delete<void>(`${this.base}/providers/${providerId}/branches/${branchId}`);
  }

  updateBranch(
    providerId: string,
    branchId: string,
    body: {
      name: string;
      addressText?: string;
      latitude: number;
      longitude: number;
      serviceRadiusMeters: number;
      isActive?: boolean;
    },
  ): Observable<ProviderBranch> {
    this.forgetProvider();
    return this.patch<ProviderBranch>(
      `/providers/${providerId}/branches/${branchId}`,
      body,
    );
  }

  addService(
    providerId: string,
    body: {
      categoryId: string;
      title: string;
      description?: string;
      basePriceText?: string;
      branchIds?: string[];
    },
  ): Observable<ProviderService> {
    this.forgetProvider();
    return this.post<ProviderService>(`/providers/${providerId}/services`, body);
  }

  updateService(
    providerId: string,
    serviceId: string,
    body: {
      categoryId?: string;
      title?: string;
      description?: string;
      basePriceText?: string;
      branchIds?: string[];
    },
  ): Observable<ProviderService> {
    this.forgetProvider();
    return this.patch<ProviderService>(
      `/providers/${providerId}/services/${serviceId}`,
      body,
    );
  }

  setServiceActive(providerId: string, serviceId: string, active: boolean): Observable<void> {
    this.forgetProvider();
    const action = active ? 'activate' : 'pause';
    return this.post<void>(`/providers/${providerId}/services/${serviceId}/${action}`, {});
  }

  deleteService(providerId: string, serviceId: string): Observable<void> {
    this.forgetProvider();
    return this.http.delete<void>(`${this.base}/providers/${providerId}/services/${serviceId}`);
  }

  setServiceBranches(
    providerId: string,
    serviceId: string,
    branchIds: string[],
  ): Observable<void> {
    this.forgetProvider();
    return this.put<void>(`/providers/${providerId}/services/${serviceId}/branches`, branchIds);
  }

  // --- Service requests (requester) ---

  listMyRequests(): Observable<ServiceRequestSummary[]> {
    return this.get<ServiceRequestSummary[]>('/service-requests/me');
  }

  getRequest(requestId: string): Observable<ServiceRequestDetail> {
    return this.get<ServiceRequestDetail>(`/service-requests/${requestId}`);
  }

  cancelRequest(requestId: string): Observable<void> {
    return this.post<void>(`/service-requests/${requestId}/cancel`, {});
  }

  startRequest(requestId: string): Observable<void> {
    return this.post<void>(`/service-requests/${requestId}/start`, {});
  }

  completeRequest(requestId: string): Observable<void> {
    return this.post<void>(`/service-requests/${requestId}/complete`, {});
  }

  createRequest(body: {
    categoryId: string;
    title: string;
    description?: string;
    addressText?: string;
    latitude: number;
    longitude: number;
    searchRadiusMeters: number;
    preferredStartAt?: string;
    preferredEndAt?: string;
    budgetText?: string;
    publish: boolean;
  }): Observable<CreatedResource> {
    return this.post<CreatedResource>('/service-requests', body);
  }

  selectProvider(requestId: string, providerId: string): Observable<void> {
    return this.post<void>(`/service-requests/${requestId}/select-provider`, { providerId });
  }

  bookProviderService(
    providerId: string,
    serviceId: string,
    body: {
      scheduledAt?: string;
      addressText?: string;
      latitude: number;
      longitude: number;
      note?: string;
    },
  ): Observable<BookProviderResult> {
    return this.post<BookProviderResult>(
      `/providers/${providerId}/services/${serviceId}/book`,
      body,
    );
  }

  // --- Bids ---

  listBids(requestId: string): Observable<BidItem[]> {
    return this.get<BidItem[]>(`/service-requests/${requestId}/bids`);
  }

  selectBid(requestId: string, bidId: string): Observable<void> {
    return this.post<void>(`/service-requests/${requestId}/select-bid`, { bidId });
  }

  clearBidSelection(requestId: string): Observable<void> {
    return this.post<void>(`/service-requests/${requestId}/clear-selection`, {});
  }

  submitBid(
    requestId: string,
    body: { priceText: string; amount?: number; description?: string },
  ): Observable<BidItem> {
    return this.post<BidItem>(`/service-requests/${requestId}/bids`, body);
  }

  withdrawBid(bidId: string): Observable<void> {
    return this.post<void>(`/bids/${bidId}/withdraw`, {});
  }

  updateBid(
    bidId: string,
    body: { priceText: string; amount?: number; description?: string },
  ): Observable<BidItem> {
    return this.patch<BidItem>(`/bids/${bidId}`, body);
  }

  // --- Appointments ---

  createAppointment(
    requestId: string,
    body: {
      scheduledAt?: string;
      addressText?: string;
      latitude?: number;
      longitude?: number;
      note?: string;
    },
  ): Observable<AppointmentDetail> {
    return this.post<AppointmentDetail>(`/service-requests/${requestId}/appointment`, body);
  }

  getAppointment(requestId: string): Observable<AppointmentDetail | null> {
    return this.get<AppointmentDetail>(`/service-requests/${requestId}/appointment`).pipe(
      catchError((err: HttpErrorLike) =>
        err.status === 404 ? of(null) : throwError(() => err),
      ),
    );
  }

  updateAppointmentStatus(appointmentId: string, status: string): Observable<AppointmentDetail> {
    const params = new HttpParams().set('status', status);
    return this.patch<AppointmentDetail>(`/appointments/${appointmentId}`, {}, { params });
  }

  // --- Reviews ---

  listReviews(providerId: string): Observable<ReviewItem[]> {
    return this.get<ReviewItem[]>(`/providers/${providerId}/reviews`);
  }

  createReview(
    providerId: string,
    body: {
      serviceRequestId?: string;
      reviewType: string;
      rating: number;
      comment?: string;
    },
  ): Observable<ReviewItem> {
    return this.post<ReviewItem>(`/providers/${providerId}/reviews`, body);
  }

  findMyReview(providerId: string, serviceRequestId: string): Observable<ReviewItem | null> {
    const params = new HttpParams().set('serviceRequestId', serviceRequestId);
    return this.get<ReviewItem>(`/providers/${providerId}/reviews/mine`, { params }).pipe(
      catchError((error: HttpErrorLike) => (error.status === 404 ? of(null) : throwError(() => error))),
    );
  }

  listMyBids(): Observable<ProviderBidListItem[]> {
    return this.get<ProviderBidListItem[]>('/provider/bids');
  }

  getProviderSummary(): Observable<ProviderHomeSummary> {
    return this.get<ProviderHomeSummary>('/provider/summary');
  }

  // --- Provider inbox ---

  listMatchingRequests(refresh = false): Observable<ProviderMatchingInbox> {
    const params = refresh ? new HttpParams().set('_t', String(Date.now())) : undefined;
    return this.get<ProviderMatchingInbox>('/provider/service-requests/matching', { params });
  }

  getBidForm(requestId: string): Observable<BidFormAccess> {
    return this.get<BidFormAccess>(`/provider/service-requests/${requestId}/bid-form`);
  }

  // --- Admin ---

  getAdminDashboard(): Observable<AdminDashboard> {
    return this.get<AdminDashboard>('/admin/dashboard');
  }

  listAdminUsers(): Observable<AdminUserRow[]> {
    return this.get<AdminUserRow[]>('/admin/users');
  }

  listAdminNotifications(): Observable<AdminNotificationRow[]> {
    return this.get<AdminNotificationRow[]>('/admin/notifications');
  }

  private forgetProvider(): void {
    this.providerEpoch += 1;
    this.providerCache = null;
    this.providerRequest = null;
  }

  private get<T>(path: string, options?: { params?: HttpParams }): Observable<T> {
    return this.http.get<T>(`${this.base}${path}`, options);
  }

  private post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, body);
  }

  private patch<T>(
    path: string,
    body: unknown,
    options?: { params?: HttpParams },
  ): Observable<T> {
    return this.http.patch<T>(`${this.base}${path}`, body, options);
  }

  private put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.base}${path}`, body);
  }
}
