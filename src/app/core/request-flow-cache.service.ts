import { Injectable } from '@angular/core';
import { BidItem, ServiceRequestDetail } from './models';

type BidsEntry = { detail: ServiceRequestDetail; bids: BidItem[]; at: number };
type ReviewEntry = { providerId: string; providerName: string; at: number };

/** In-session cache so flow pages can paint before refetch (N-6). */
@Injectable({ providedIn: 'root' })
export class RequestFlowCacheService {
  private readonly ttlMs = 120_000;
  private readonly bidsByRequest = new Map<string, BidsEntry>();
  private readonly reviewByRequest = new Map<string, ReviewEntry>();
  private readonly requestById = new Map<string, { detail: ServiceRequestDetail; at: number }>();

  peekRequest(requestId: string): ServiceRequestDetail | null {
    const row = this.requestById.get(requestId);
    if (!row || Date.now() - row.at > this.ttlMs) {
      return null;
    }
    return row.detail;
  }

  putRequest(detail: ServiceRequestDetail): void {
    this.requestById.set(detail.id, { detail, at: Date.now() });
  }

  peekPrivateBids(requestId: string): BidsEntry | null {
    const row = this.bidsByRequest.get(requestId);
    if (!row || Date.now() - row.at > this.ttlMs) {
      return null;
    }
    return row;
  }

  putPrivateBids(detail: ServiceRequestDetail, bids: BidItem[]): void {
    const at = Date.now();
    this.bidsByRequest.set(detail.id, { detail, bids, at });
    this.requestById.set(detail.id, { detail, at });
  }

  peekReview(requestId: string): ReviewEntry | null {
    const row = this.reviewByRequest.get(requestId);
    if (!row || Date.now() - row.at > this.ttlMs) {
      return null;
    }
    return row;
  }

  putReview(requestId: string, providerId: string, providerName: string): void {
    this.reviewByRequest.set(requestId, { providerId, providerName, at: Date.now() });
  }

  clear(): void {
    this.bidsByRequest.clear();
    this.reviewByRequest.clear();
    this.requestById.clear();
  }
}
