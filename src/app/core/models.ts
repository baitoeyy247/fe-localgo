export interface UserProfile {
  id: string;
  displayName: string;
  pictureUrl?: string | null;
  systemRole: string;
  activeRole?: string | null;
  privacyNoticeAccepted: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: UserProfile;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

export interface ProviderSummary {
  providerId: string;
  providerName: string;
  matchedBranchId?: string | null;
  matchedServiceId?: string | null;
  categoryName?: string | null;
  distanceMeters: number;
  averageVerifiedRating: number;
  averagePublicRating: number;
  verifiedReviewCount: number;
}

export interface ProviderBranch {
  id: string;
  name: string;
  addressText?: string | null;
  latitude: number;
  longitude: number;
  serviceRadiusMeters: number;
  isActive: boolean;
}

export interface ProviderService {
  id: string;
  categoryId: string;
  categoryName?: string | null;
  title: string;
  description?: string | null;
  basePriceText?: string | null;
  isActive: boolean;
  branchIds?: string[];
}

export interface ProviderDetail {
  id: string;
  providerType: string;
  name: string;
  description?: string | null;
  contactLineId?: string | null;
  contactPhone?: string | null;
  contactUrl?: string | null;
  status: string;
  averageVerifiedRating: number;
  averagePublicRating: number;
  verifiedReviewCount: number;
  publicReviewCount: number;
  branches: ProviderBranch[];
  services: ProviderService[];
}

export interface ProviderCoverageArea {
  name: string;
  serviceRadiusMeters: number;
}

export interface ProviderMatchingInbox {
  items: ServiceRequestSummary[];
  excludesOwnRequests: boolean;
  areas: ProviderCoverageArea[];
}

export interface BidFormAccess {
  allowed: boolean;
  reason?: string | null;
  request?: ServiceRequestDetail | null;
}

export interface ServiceRequestSummary {
  id: string;
  title: string;
  status: string;
  categoryName?: string | null;
  createdAt: string;
  bidCount: number;
  budgetText?: string | null;
  distanceMeters?: number | null;
  alreadyBidByMe?: boolean;
  needsAppointmentConfirm?: boolean;
}

export interface ServiceRequestDetail {
  id: string;
  title: string;
  description?: string | null;
  addressText?: string | null;
  categoryId: string;
  categoryName?: string | null;
  status: string;
  latitude: number;
  longitude: number;
  searchRadiusMeters: number;
  budgetText?: string | null;
  selectedProviderId?: string | null;
  selectedBidId?: string | null;
  source?: string | null;
  providerServiceId?: string | null;
  createdAt: string;
  updatedAt: string;
  bids?: BidItem[];
}

export interface BidItem {
  id: string;
  providerId: string;
  providerName: string;
  priceText: string;
  description?: string | null;
  availableAt?: string | null;
  status: string;
}

export interface AppointmentDetail {
  id: string;
  serviceRequestId: string;
  providerId: string;
  requesterUserId: string;
  scheduledAt?: string | null;
  addressText?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status: string;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewItem {
  id: string;
  rating: number;
  comment?: string | null;
  reviewType: string;
  createdAt: string;
}

export interface AdminDashboard {
  users: number;
  providers: number;
  publishedRequests: number;
  completedRequests: number;
  expiredRequests: number;
  pendingNotifications: number;
}

export interface LineConfig {
  channelId?: string;
  liffId?: string;
  liffEntryUrl?: string;
  expectedWebOrigin?: string;
  lineLoginReady?: boolean;
}

export interface CreatedResource {
  id: string;
}

export interface BookProviderResult {
  appointmentId: string;
  serviceRequestId: string;
}

export interface AdminUserRow {
  id?: string;
  displayName?: string;
  lineUserId?: string;
  systemRole?: string;
}

export interface AdminNotificationRow {
  eventType?: string;
  type?: string;
  status?: string;
  createdAt?: string;
}
