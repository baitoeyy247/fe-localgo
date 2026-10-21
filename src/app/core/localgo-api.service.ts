import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
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
    return this.get<ServiceRequestSummary[]>('/provider/service-requests/matching', { params });
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
