/** QA32 M-1 — skeleton layout targets (CLS @ 320–430×800, API delay ~2.5s). */

export const SKELETON_STACK_GAP_PX = 12;
export const SKELETON_FORM_FIELD_HEIGHT_PX = 52;
export const SKELETON_CLS_TOLERANCE_PX = 8;
export const SKELETON_E2E_API_DELAY_MS = 2500;
export const SKELETON_E2E_VIEWPORT_WIDTHS = [320, 375, 390, 412, 430] as const;

export type SkeletonPagePreset =
  | 'requester-home'
  | 'bids'
  | 'provider-requests'
  | 'provider-my-bids'
  | 'appointment-detail'
  | 'request-detail'
  | 'provider-request-detail'
  | 'coverage'
  | 'post-form';

export type SkeletonPresetLayout = {
  count: number;
  variant: 'list' | 'detail' | 'form';
  stackModifier: string;
  firstCardHeightPx: number;
  cardHeightsPx?: number[];
  stackOffsetPx: number;
  /** Target offset from `.page-content` top to first skeleton card / form field (px). */
  contentFirstCardTopPx: number;
  flowChrome: boolean;
  flowChromeHeightPx: number;
  requestSummaryChrome: boolean;
  requestSummaryHeightPx: number;
  headerChrome: boolean;
  headerChromeVariant?: 'card' | 'sec-title';
  headerChromeHeightPx: number;
  filterChrome: boolean;
  filterChromeMode?: 'inbox' | 'chips';
  filterChromeHeightPx: number;
  sectionChrome: boolean;
  sectionChromeHeightPx: number;
};

export const SKELETON_PAGE_PRESETS: Record<SkeletonPagePreset, SkeletonPresetLayout> = {
  'requester-home': {
    count: 2,
    variant: 'list',
    stackModifier: 'requester-home',
    firstCardHeightPx: 243,
    stackOffsetPx: 0,
    contentFirstCardTopPx: 0,
    flowChrome: false,
    flowChromeHeightPx: 0,
    requestSummaryChrome: false,
    requestSummaryHeightPx: 0,
    headerChrome: false,
    headerChromeHeightPx: 0,
    filterChrome: false,
    filterChromeHeightPx: 0,
    sectionChrome: false,
    sectionChromeHeightPx: 0,
  },
  bids: {
    count: 2,
    variant: 'list',
    stackModifier: 'bids',
    firstCardHeightPx: 82,
    cardHeightsPx: [82, 178],
    stackOffsetPx: 0,
    contentFirstCardTopPx: 302,
    flowChrome: true,
    flowChromeHeightPx: 56,
    requestSummaryChrome: true,
    requestSummaryHeightPx: 82,
    headerChrome: true,
    headerChromeVariant: 'sec-title',
    headerChromeHeightPx: 26,
    filterChrome: false,
    filterChromeHeightPx: 0,
    sectionChrome: false,
    sectionChromeHeightPx: 0,
  },
  'provider-requests': {
    count: 2,
    variant: 'list',
    stackModifier: 'provider-requests',
    firstCardHeightPx: 166,
    cardHeightsPx: [166, 166],
    stackOffsetPx: 0,
    contentFirstCardTopPx: 273,
    flowChrome: false,
    flowChromeHeightPx: 0,
    requestSummaryChrome: false,
    requestSummaryHeightPx: 0,
    headerChrome: false,
    headerChromeHeightPx: 0,
    filterChrome: true,
    filterChromeMode: 'inbox',
    filterChromeHeightPx: 117,
    sectionChrome: false,
    sectionChromeHeightPx: 0,
  },
  'provider-my-bids': {
    count: 2,
    variant: 'list',
    stackModifier: 'provider-my-bids',
    firstCardHeightPx: 246,
    cardHeightsPx: [246, 246],
    stackOffsetPx: 0,
    contentFirstCardTopPx: 74,
    flowChrome: false,
    flowChromeHeightPx: 0,
    requestSummaryChrome: false,
    requestSummaryHeightPx: 0,
    headerChrome: false,
    headerChromeHeightPx: 0,
    filterChrome: true,
    filterChromeMode: 'chips',
    filterChromeHeightPx: 52,
    sectionChrome: false,
    sectionChromeHeightPx: 0,
  },
  'appointment-detail': {
    count: 2,
    variant: 'detail',
    stackModifier: 'appointment-detail',
    firstCardHeightPx: 117,
    cardHeightsPx: [117, 125],
    stackOffsetPx: 0,
    contentFirstCardTopPx: 72,
    flowChrome: false,
    flowChromeHeightPx: 0,
    requestSummaryChrome: false,
    requestSummaryHeightPx: 0,
    headerChrome: false,
    headerChromeHeightPx: 0,
    filterChrome: false,
    filterChromeHeightPx: 0,
    sectionChrome: false,
    sectionChromeHeightPx: 0,
  },
  'request-detail': {
    count: 2,
    variant: 'detail',
    stackModifier: 'request-detail',
    firstCardHeightPx: 238,
    stackOffsetPx: 0,
    contentFirstCardTopPx: 88,
    flowChrome: false,
    flowChromeHeightPx: 0,
    requestSummaryChrome: false,
    requestSummaryHeightPx: 0,
    headerChrome: false,
    headerChromeHeightPx: 0,
    filterChrome: false,
    filterChromeHeightPx: 0,
    sectionChrome: false,
    sectionChromeHeightPx: 0,
  },
  'provider-request-detail': {
    count: 2,
    variant: 'detail',
    stackModifier: 'provider-request-detail',
    firstCardHeightPx: 135,
    cardHeightsPx: [135, 224],
    stackOffsetPx: 0,
    contentFirstCardTopPx: 72,
    flowChrome: false,
    flowChromeHeightPx: 0,
    requestSummaryChrome: false,
    requestSummaryHeightPx: 0,
    headerChrome: false,
    headerChromeHeightPx: 0,
    filterChrome: false,
    filterChromeHeightPx: 0,
    sectionChrome: false,
    sectionChromeHeightPx: 0,
  },
  coverage: {
    count: 1,
    variant: 'list',
    stackModifier: 'coverage',
    firstCardHeightPx: 320,
    stackOffsetPx: 0,
    contentFirstCardTopPx: 257,
    flowChrome: false,
    flowChromeHeightPx: 0,
    requestSummaryChrome: false,
    requestSummaryHeightPx: 0,
    headerChrome: false,
    headerChromeHeightPx: 0,
    filterChrome: false,
    filterChromeHeightPx: 0,
    sectionChrome: true,
    sectionChromeHeightPx: 44,
  },
  'post-form': {
    count: 1,
    variant: 'form',
    stackModifier: 'post-form',
    firstCardHeightPx: SKELETON_FORM_FIELD_HEIGHT_PX,
    stackOffsetPx: 0,
    contentFirstCardTopPx: 72,
    flowChrome: false,
    flowChromeHeightPx: 0,
    requestSummaryChrome: false,
    requestSummaryHeightPx: 0,
    headerChrome: false,
    headerChromeHeightPx: 0,
    filterChrome: false,
    filterChromeHeightPx: 0,
    sectionChrome: false,
    sectionChromeHeightPx: 0,
  },
};

export function skeletonFirstCardOffsetPx(preset: SkeletonPagePreset): number {
  const spec = SKELETON_PAGE_PRESETS[preset];
  let offset = spec.stackOffsetPx;
  if (spec.flowChrome) {
    offset += spec.flowChromeHeightPx;
  }
  if (spec.requestSummaryChrome) {
    offset += spec.requestSummaryHeightPx;
  }
  if (spec.sectionChrome) {
    offset += spec.sectionChromeHeightPx;
  }
  if (spec.headerChrome) {
    offset += spec.headerChromeHeightPx;
  }
  if (spec.filterChrome) {
    offset += spec.filterChromeHeightPx;
  }
  const chromeBlocks =
    (spec.flowChrome ? 1 : 0) +
    (spec.requestSummaryChrome ? 1 : 0) +
    (spec.sectionChrome ? 1 : 0) +
    (spec.headerChrome ? 1 : 0) +
    (spec.filterChrome ? 1 : 0);
  if (chromeBlocks > 0) {
    offset += chromeBlocks * SKELETON_STACK_GAP_PX;
  }
  return offset;
}

export type SkeletonE2ERouteCase = {
  name: string;
  path: string | ((ctx: { requestId?: string; appointmentId?: string; providerRequestId?: string }) => string);
  personaKey: string;
  preset: SkeletonPagePreset;
  loadedSelector?: string;
  skeletonSelector?: string;
  /** When set, assert second skeleton/loaded card alignment (list/detail presets). */
  assertSecondCard?: boolean;
};

export const SKELETON_E2E_ROUTE_CASES: SkeletonE2ERouteCase[] = [
  {
    name: 'requester-home',
    path: '/requester',
    personaKey: 'req-01',
    preset: 'requester-home',
    loadedSelector: '.page-content .sec-title ~ div.card',
    skeletonSelector: '.page-content .skeleton-stack--requester-home .skeleton-card',
    assertSecondCard: true,
  },
  {
    name: 'requester-bids',
    path: '/requester/bids',
    personaKey: 'req-01',
    preset: 'bids',
    loadedSelector: '.page-content article.card',
    skeletonSelector: '.page-content .skeleton-stack--bids .skeleton-card',
    assertSecondCard: true,
  },
  {
    name: 'appointment-detail',
    path: ({ appointmentId }) => `/requester/appointments/${appointmentId ?? 'e2e-placeholder'}`,
    personaKey: 'req-01',
    preset: 'appointment-detail',
    loadedSelector: '.page-content .card:not(.skeleton-card)',
    assertSecondCard: true,
  },
  {
    name: 'provider-requests',
    path: '/provider/requests',
    personaKey: 'prov-01',
    preset: 'provider-requests',
    loadedSelector: '.page-content .chips--scroll ~ article.card',
    skeletonSelector: '.page-content .skeleton-stack--provider-requests .skeleton-card',
    assertSecondCard: true,
  },
  {
    name: 'provider-my-bids',
    path: '/provider/my-bids',
    personaKey: 'prov-01',
    preset: 'provider-my-bids',
    loadedSelector: '.page-content .chips[aria-label="กรองตามสถานะ"] ~ article.card',
    skeletonSelector: '.page-content .skeleton-stack--provider-my-bids .skeleton-card',
    assertSecondCard: true,
  },
  {
    name: 'provider-request-detail',
    path: ({ providerRequestId }) => `/provider/requests/${providerRequestId ?? 'e2e-placeholder'}`,
    personaKey: 'prov-01',
    preset: 'provider-request-detail',
    loadedSelector: '.page-content .card:not(.skeleton-card)',
    assertSecondCard: true,
  },
  {
    name: 'provider-coverage',
    path: '/provider/coverage',
    personaKey: 'prov-01',
    preset: 'coverage',
    loadedSelector: '.page-content article.coverage-card, .page-content article.card',
  },
  {
    name: 'requester-post',
    path: '/requester/post',
    personaKey: 'req-01',
    preset: 'post-form',
    skeletonSelector: '.skeleton-stack--post-form .skeleton-form-field',
    loadedSelector: '.post-request-form .field',
  },
];

const SKELETON_E2E_ALIGN_ROUTE_NAMES = [
  'requester-home',
  'requester-bids',
  'appointment-detail',
  'provider-requests',
  'provider-my-bids',
  'provider-request-detail',
  'provider-coverage',
] as const;

/** Six SIT routes in QA31 M-1 scope (excludes post-form). */
export const SKELETON_E2E_ALIGN_ROUTE_CASES: SkeletonE2ERouteCase[] =
  SKELETON_E2E_ALIGN_ROUTE_NAMES.map(
    (name) => SKELETON_E2E_ROUTE_CASES.find((c) => c.name === name)!,
  );
