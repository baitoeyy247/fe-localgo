import { Injectable } from '@angular/core';

const REQUESTER_REQUEST_ID = 'localgo_requester_request_id';
const PROVIDER_REQUEST_ID = 'localgo_provider_request_id';
const LEGACY_REQUEST_ID = 'localgo_current_request_id';
const PROVIDER_ID = 'localgo_current_provider_id';

@Injectable({ providedIn: 'root' })
export class SessionStateService {
  /** Active service request in requester flow (bids, appointment, review). */
  get requesterRequestId(): string | null {
    const direct = sessionStorage.getItem(REQUESTER_REQUEST_ID);
    if (direct) {
      return direct;
    }
    const legacy = sessionStorage.getItem(LEGACY_REQUEST_ID);
    if (legacy) {
      sessionStorage.setItem(REQUESTER_REQUEST_ID, legacy);
      sessionStorage.removeItem(LEGACY_REQUEST_ID);
    }
    return legacy;
  }

  set requesterRequestId(id: string | null) {
    sessionStorage.removeItem(LEGACY_REQUEST_ID);
    if (id) {
      sessionStorage.setItem(REQUESTER_REQUEST_ID, id);
    } else {
      sessionStorage.removeItem(REQUESTER_REQUEST_ID);
    }
  }

  /** Alias kept for existing call sites; same storage as requesterRequestId. */
  get currentRequestId(): string | null {
    return this.requesterRequestId;
  }

  set currentRequestId(id: string | null) {
    this.requesterRequestId = id;
  }

  /** Provider-side context: detail page, submit bid, etc. */
  get providerRequestId(): string | null {
    return sessionStorage.getItem(PROVIDER_REQUEST_ID);
  }

  set providerRequestId(id: string | null) {
    if (id) {
      sessionStorage.setItem(PROVIDER_REQUEST_ID, id);
    } else {
      sessionStorage.removeItem(PROVIDER_REQUEST_ID);
    }
  }

  get currentProviderId(): string | null {
    return sessionStorage.getItem(PROVIDER_ID);
  }

  set currentProviderId(id: string | null) {
    if (id) {
      sessionStorage.setItem(PROVIDER_ID, id);
    } else {
      sessionStorage.removeItem(PROVIDER_ID);
    }
  }

  clearRequesterFlow(): void {
    this.requesterRequestId = null;
    this.currentProviderId = null;
  }

  clearProviderRequest(): void {
    this.providerRequestId = null;
  }
}
