import type { APIRequestContext } from '@playwright/test';

const API_BASE =
  process.env.E2E_API_BASE_URL ?? 'https://be-localgo-ul36.onrender.com/api';

const CLEANING_CATEGORY_ID = 'eef6548b-0ded-41a1-9d37-e925fdfd89e3';
const SEED_LAT = 16.1880948;
const SEED_LNG = 103.2987346;
const SEED_TITLE = 'QA R30 skeleton seed';

export type SitPlaytestIds = {
  requestId?: string;
  appointmentId?: string;
  providerRequestId?: string;
};

async function devLogin(
  request: APIRequestContext,
  personaKey: string,
  displayName: string,
  activeRole: 'Requester' | 'Provider',
): Promise<string> {
  const res = await request.post(`${API_BASE}/auth/dev/login`, {
    data: { personaKey, displayName, activeRole },
  });
  if (!res.ok()) {
    throw new Error(`dev login failed for ${personaKey}: ${res.status()} ${await res.text()}`);
  }
  const body = (await res.json()) as { accessToken: string };
  return body.accessToken;
}

/** Ensures req-01 has a published job + bid + appointment for skeleton E2E on empty SIT. */
export async function ensureSitPlaytestMarketplace(
  request: APIRequestContext,
): Promise<SitPlaytestIds> {
  const reqToken = await devLogin(request, 'req-01', 'QA ผู้รับ 01', 'Requester');
  const auth = { Authorization: `Bearer ${reqToken}` };

  const mineRes = await request.get(`${API_BASE}/service-requests/me`, { headers: auth });
  const mine = mineRes.ok() ? ((await mineRes.json()) as { id: string; title: string }[]) : [];

  let requestId =
    mine.find((r) => r.title === SEED_TITLE)?.id ??
    mine.find((r) => r.title.includes('QA R30'))?.id ??
    mine[0]?.id;

  if (!requestId) {
    const preferredStartAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const createRes = await request.post(`${API_BASE}/service-requests`, {
      headers: auth,
      data: {
        categoryId: CLEANING_CATEGORY_ID,
        title: SEED_TITLE,
        addressText: 'มหาสารคาม เมือง',
        latitude: SEED_LAT,
        longitude: SEED_LNG,
        searchRadiusMeters: 10_000,
        preferredStartAt,
        budgetText: 'เปิดรับราคา',
        budgetType: 'open',
        publish: true,
      },
    });
    if (!createRes.ok()) {
      throw new Error(`create request failed: ${createRes.status()} ${await createRes.text()}`);
    }
    const created = (await createRes.json()) as { id: string };
    requestId = created.id;

    const provToken = await devLogin(request, 'prov-01', 'QA ผู้ให้ 01', 'Provider');
    const provAuth = { Authorization: `Bearer ${provToken}` };
    const bidRes = await request.post(`${API_BASE}/service-requests/${requestId}/bids`, {
      headers: provAuth,
      data: { priceText: '450 บาท', amount: 450, description: 'QA R30 E2E' },
    });
    if (!bidRes.ok()) {
      throw new Error(`submit bid failed: ${bidRes.status()} ${await bidRes.text()}`);
    }
    const bid = (await bidRes.json()) as { id: string };
    const selectRes = await request.post(`${API_BASE}/service-requests/${requestId}/select-bid`, {
      headers: auth,
      data: { bidId: bid.id },
    });
    if (!selectRes.ok() && selectRes.status() !== 204) {
      throw new Error(`select bid failed: ${selectRes.status()} ${await selectRes.text()}`);
    }
  }

  let appointmentId: string | undefined;
  const apptRes = await request.get(`${API_BASE}/service-requests/${requestId}/appointment`, {
    headers: auth,
  });
  if (apptRes.ok()) {
    const appt = (await apptRes.json()) as { id: string };
    appointmentId = appt.id;
  } else if (apptRes.status() === 404) {
    const createAppt = await request.post(`${API_BASE}/service-requests/${requestId}/appointment`, {
      headers: auth,
      data: {
        scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        addressText: 'มหาสารคาม เมือง',
        latitude: SEED_LAT,
        longitude: SEED_LNG,
      },
    });
    if (!createAppt.ok()) {
      throw new Error(`create appointment failed: ${createAppt.status()} ${await createAppt.text()}`);
    }
    appointmentId = ((await createAppt.json()) as { id: string }).id;
  }

  const provToken = await devLogin(request, 'prov-01', 'QA ผู้ให้ 01', 'Provider');
  const matchRes = await request.get(`${API_BASE}/provider/service-requests/matching`, {
    headers: { Authorization: `Bearer ${provToken}` },
  });
  let providerRequestId = requestId;
  if (matchRes.ok()) {
    const match = (await matchRes.json()) as { items?: { id: string }[] };
    providerRequestId = match.items?.[0]?.id ?? requestId;
  }

  return { requestId, appointmentId, providerRequestId };
}
