import { firstValueFrom } from 'rxjs';
import { LocalGoApiService } from '../core/localgo-api.service';
import { SessionStateService } from '../core/session-state.service';
import { ServiceRequestSummary } from '../core/models';

export type RequesterRequestPickStrategy = 'appointment' | 'bids';

export async function canAccessServiceRequest(
  api: LocalGoApiService,
  requestId: string,
): Promise<boolean> {
  try {
    await firstValueFrom(api.getRequest(requestId));
    return true;
  } catch {
    return false;
  }
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
  return (
    mine.find((r) => r.status === 'Open' || r.status === 'HasOffers') ?? mine[0]
  );
}

export async function findActiveRequesterRequestId(
  api: LocalGoApiService,
  strategy: RequesterRequestPickStrategy,
): Promise<string | null> {
  try {
    const mine = await firstValueFrom(api.listMyRequests());
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
  },
): Promise<string | null> {
  let requestId = options.queryRequestId ?? session.requesterRequestId;
  if (requestId && !(await canAccessServiceRequest(api, requestId))) {
    requestId = null;
  }
  if (!requestId) {
    requestId = await findActiveRequesterRequestId(api, options.strategy);
  }
  if (requestId && options.persist !== false) {
    session.requesterRequestId = requestId;
  }
  return requestId;
}
