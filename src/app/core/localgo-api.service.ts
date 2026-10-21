import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { normalizeList, normalizeMatchingInbox } from '../shared/normalize-list';
import {
  AdminDashboard,
  AdminNotificationRow,
  AdminUserRow,
  AppointmentDetail,
  AuthResponse,
  BidItem,
  ProviderBidListItem,
  BookProviderResult,
  Category,
  CreatedResource,
  LineConfig,
  ProviderBranch,
  ProviderDetail,
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

  // --- Auth & profile ---

  lineLogin(lineIdToken: string): Observable<AuthResponse> {
    return this.post<AuthResponse>('/auth/line/login', { lineIdToken });
  }

  devLogin(body: {
    displayName?: string;
    activeRole?: string;
    asAdmin?: boolean;
    personaKey?: string;
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
    return this.get<Category[]>('/categories');
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
    return this.get<ProviderDetail>('/providers/me');
  }

  createProvider(body: {
    providerType: string;
    name: string;
    description?: string;
    contactLineId?: string;
    contactPhone?: string;
    contactUrl?: string;
  }): Observable<ProviderDetail> {
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
    return this.post<ProviderBranch>(`/providers/${providerId}/branches`, body);
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
    return this.patch<ProviderBranch>(
      `/providers/${providerId}/branches/${branchId}`,
      body,
    );
  }

  deleteBranch(providerId: string, branchId: string): Observable<void> {
    return this.delete<void>(`/providers/${providerId}/branches/${branchId}`);
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
    return this.patch<ProviderService>(
      `/providers/${providerId}/services/${serviceId}`,
      body,
    );
  }

  setServiceActive(providerId: string, serviceId: string, active: boolean): Observable<void> {
    const action = active ? 'activate' : 'pause';
    return this.post<void>(`/providers/${providerId}/services/${serviceId}/${action}`, {});
  }

  setServiceBranches(
    providerId: string,
    serviceId: string,
    branchIds: string[],
  ): Observable<void> {
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

  listMyProviderBids(): Observable<ProviderBidListItem[]> {
    return this.get<ProviderBidListItem[]>('/provider/bids');
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

  // --- Provider inbox ---

  listMatchingRequests(refresh = false): Observable<ServiceRequestSummary[]> {
    const params = refresh ? new HttpParams().set('_t', String(Date.now())) : undefined;
    return this.get<unknown>('/provider/service-requests/matching', { params }).pipe(
      map((raw) => normalizeMatchingInbox(raw).all),
    );
  }

  getAppointmentById(appointmentId: string): Observable<AppointmentDetail> {
    return this.get<AppointmentDetail>(`/appointments/${appointmentId}`);
  }

  // --- Admin ---

  getAdminDashboard(): Observable<AdminDashboard> {
    return this.get<AdminDashboard>('/admin/dashboard');
  }

  listAdminUsers(page = 1, pageSize = 20): Observable<{ items: AdminUserRow[]; total: number }> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));
    return this.get<unknown>('/admin/users', { params }).pipe(
      map((raw) => {
        if (raw && typeof raw === 'object' && Array.isArray((raw as { items?: unknown }).items)) {
          const body = raw as { items: AdminUserRow[]; total?: number };
          return { items: body.items, total: body.total ?? body.items.length };
        }
        const items = normalizeList<AdminUserRow>(raw);
        return { items, total: items.length };
      }),
    );
  }

  setAdminUserStatus(userId: string, status: 'Active' | 'Suspended'): Observable<void> {
    return this.patch<void>(`/admin/users/${userId}/status`, { status });
  }

  listAdminServiceRequests(status?: string): Observable<ServiceRequestSummary[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.get<unknown>('/admin/service-requests', { params }).pipe(
      map((raw) => normalizeList<ServiceRequestSummary>(raw)),
    );
  }

  listAdminAppointments(status?: string): Observable<AppointmentDetail[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.get<unknown>('/admin/appointments', { params }).pipe(
      map((raw) => normalizeList<AppointmentDetail>(raw)),
    );
  }

  listAdminNotifications(): Observable<AdminNotificationRow[]> {
    return this.get<unknown>('/admin/notifications').pipe(
      map((raw) => normalizeList<AdminNotificationRow>(raw)),
    );
  }

  resetTestData(): Observable<{ deletedUsers: number }> {
    return this.post<{ deletedUsers: number }>('/admin/test-data/reset', {});
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

  private delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.base}${path}`);
  }
}
