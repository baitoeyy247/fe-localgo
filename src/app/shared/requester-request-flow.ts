import { firstValueFrom } from 'rxjs';
import { LocalGoApiService } from '../core/localgo-api.service';
import { MarketplaceCacheService } from '../core/marketplace-cache.service';
import { SessionStateService } from '../core/session-state.service';
import { ServiceRequestSummary } from '../core/models';

export type RequesterRequestPickStrategy = 'appointment' | 'bids';

async function loadMyRequests(
  api: LocalGoApiService,
  cache?: MarketplaceCacheService,
): Promise<ServiceRequestSummary[]> {
  if (cache) {
    return firstValueFrom(cache.listMyRequests());
  }
  return firstValueFrom(api.listMyRequests());
}

function pickActiveRequest(
  mine: ServiceRequestSummary[],
  strategy: RequesterRequestPickStrategy,
): ServiceRequestSummary | undefined {
  if (strategy === 'appointment') {
    const active = mine.filter(
      (r) =>
        r.status === 'InProgress' ||
        r.status === 'Scheduled' ||
        r.status === 'ProviderSelected' ||
        r.status === 'HasOffers' ||
        r.status === 'Open' ||
        r.status === 'Completed',
    );
    return (
      active.find((r) => r.status === 'InProgress') ??
      active.find((r) => r.status === 'Scheduled' || r.status === 'ProviderSelected') ??
      active.find((r) => r.status === 'HasOffers' || r.status === 'Open') ??
      active.find((r) => r.status === 'Completed') ??
      undefined
    );
  }
  const selectedOrScheduled = mine.find(
    (r) => r.status === 'ProviderSelected' || r.status === 'Scheduled',
  );
  if (selectedOrScheduled) {
    return selectedOrScheduled;
  }
  return mine.find((r) => r.status === 'Open' || r.status === 'HasOffers') ?? mine[0];
}

export async function canAccessServiceRequest(
  api: LocalGoApiService,
  requestId: string,
  mine?: ServiceRequestSummary[],
  cache?: MarketplaceCacheService,
): Promise<boolean> {
  try {
    const list = mine ?? (await loadMyRequests(api, cache));
    return list.some((r) => r.id === requestId);
  } catch {
    return false;
  }
}

export async function findActiveRequesterRequestId(
  api: LocalGoApiService,
  strategy: RequesterRequestPickStrategy,
  cache?: MarketplaceCacheService,
): Promise<string | null> {
  try {
    const mine = await loadMyRequests(api, cache);
    return pickActiveRequest(mine, strategy)?.id ?? null;
  } catch {
    return null;
  }
}

/** Resolve requester flow request id from query/session, with access check and fallback. */
export async function resolveRequesterRequestId(
  api: LocalGoApiService,
  session: SessionStateService,
  options: {
    queryRequestId?: string | null;
    strategy: RequesterRequestPickStrategy;
    persist?: boolean;
    cache?: MarketplaceCacheService;
  },
): Promise<string | null> {
  const list = await loadMyRequests(api, options.cache);
  let requestId = options.queryRequestId ?? session.requesterRequestId;
  if (requestId && !list.some((r) => r.id === requestId)) {
    requestId = null;
  }
  if (!requestId) {
    requestId = pickActiveRequest(list, options.strategy)?.id ?? null;
  }
  if (requestId && options.persist !== false) {
    session.requesterRequestId = requestId;
  }
  return requestId;
}
