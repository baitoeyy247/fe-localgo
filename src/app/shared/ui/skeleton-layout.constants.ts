/** QA28 M-1 — skeleton layout targets (CLS proxy @ 375×800, API delay ~2.5s). Sync with styles.scss skeleton-stack--*. */

export const SKELETON_STACK_GAP_PX = 12;
export const SKELETON_FORM_FIELD_HEIGHT_PX = 52;
export const SKELETON_CLS_TOLERANCE_PX = 8;
export const SKELETON_E2E_API_DELAY_MS = 2500;

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
  /** min-height of the first `.skeleton-card` (or first form block) in the stack (px). */
  firstCardHeightPx: number;
  /** Optional per-card min-heights (index 0 = first card). */
  cardHeightsPx?: number[];
  /** padding-top on `.skeleton-stack` (px) — below in-page chrome (flow bar / banners). */
  stackOffsetPx: number;
  /** Measured offset from `.page-content` top to first skeleton card top (px). */
  contentFirstCardTopPx: number;
  /** Optional summary / job header block above list cards. */
  headerChrome: boolean;
  headerChromeHeightPx: number;
  /** Filter tabs / chips block (provider inbox). */
  filterChrome: boolean;
  filterChromeMode?: 'inbox' | 'chips';
  filterChromeHeightPx: number;
  /** When true, `.skeleton-stack` uses padding-top = contentFirstCardTopPx (in-page chrome hidden while loading). */
  padToContentFirstCard: boolean;
  /** Section title row above cards (coverage list header). */
  sectionChrome: boolean;
  sectionChromeHeightPx: number;
};

export const SKELETON_PAGE_PRESETS: Record<SkeletonPagePreset, SkeletonPresetLayout> = {
  'requester-home': {
    count: 2,
    variant: 'list',
    stackModifier: 'requester-home',
    firstCardHeightPx: 120,
    stackOffsetPx: 0,
    contentFirstCardTopPx: 0,
    headerChrome: false,
    headerChromeHeightPx: 0,
    filterChrome: false,
    filterChromeHeightPx: 0,
    sectionChrome: false,
    sectionChromeHeightPx: 0,
    padToContentFirstCard: false,
  },
  bids: {
    count: 3,
    variant: 'list',
    stackModifier: 'bids',
    firstCardHeightPx: 82,
    cardHeightsPx: [82, 178, 147],
    stackOffsetPx: 0,
    contentFirstCardTopPx: 190,
    headerChrome: false,
    headerChromeHeightPx: 0,
    filterChrome: false,
    filterChromeHeightPx: 0,
    sectionChrome: false,
    sectionChromeHeightPx: 0,
    padToContentFirstCard: true,
  },
  'provider-requests': {
    count: 3,
    variant: 'list',
    stackModifier: 'provider-requests',
    firstCardHeightPx: 169,
    stackOffsetPx: 0,
    contentFirstCardTopPx: 278,
    headerChrome: false,
    headerChromeHeightPx: 0,
    filterChrome: false,
    filterChromeHeightPx: 0,
    sectionChrome: false,
    sectionChromeHeightPx: 0,
    padToContentFirstCard: true,
  },
  'provider-my-bids': {
    count: 2,
    variant: 'list',
    stackModifier: 'provider-my-bids',
    firstCardHeightPx: 194,
    stackOffsetPx: 0,
    contentFirstCardTopPx: 130,
    headerChrome: false,
    headerChromeHeightPx: 0,
    filterChrome: true,
    filterChromeMode: 'chips',
    filterChromeHeightPx: 44,
    sectionChrome: false,
    sectionChromeHeightPx: 0,
    padToContentFirstCard: true,
  },
  'appointment-detail': {
    count: 2,
    variant: 'detail',
    stackModifier: 'appointment-detail',
    firstCardHeightPx: 72,
    cardHeightsPx: [72, 125],
    stackOffsetPx: 0,
    contentFirstCardTopPx: 72,
    headerChrome: false,
    headerChromeHeightPx: 0,
    filterChrome: false,
    filterChromeHeightPx: 0,
    sectionChrome: false,
    sectionChromeHeightPx: 0,
    padToContentFirstCard: true,
  },
  'request-detail': {
    count: 2,
    variant: 'detail',
    stackModifier: 'request-detail',
    firstCardHeightPx: 88,
    stackOffsetPx: 0,
    contentFirstCardTopPx: 88,
    headerChrome: false,
    headerChromeHeightPx: 0,
    filterChrome: false,
    filterChromeHeightPx: 0,
    sectionChrome: false,
    sectionChromeHeightPx: 0,
    padToContentFirstCard: false,
  },
  'provider-request-detail': {
    count: 3,
    variant: 'detail',
    stackModifier: 'provider-request-detail',
    firstCardHeightPx: 110,
    cardHeightsPx: [110, 224, 185],
    stackOffsetPx: 0,
    contentFirstCardTopPx: 72,
    headerChrome: false,
    headerChromeHeightPx: 0,
    filterChrome: false,
    filterChromeHeightPx: 0,
    sectionChrome: false,
    sectionChromeHeightPx: 0,
    padToContentFirstCard: true,
  },
  coverage: {
    count: 1,
    variant: 'list',
    stackModifier: 'coverage',
    firstCardHeightPx: 320,
    stackOffsetPx: 0,
    contentFirstCardTopPx: 233,
    headerChrome: false,
    headerChromeHeightPx: 0,
    filterChrome: false,
    filterChromeHeightPx: 0,
    sectionChrome: true,
    sectionChromeHeightPx: 32,
    padToContentFirstCard: true,
  },
  'post-form': {
    count: 1,
    variant: 'form',
    stackModifier: 'post-form',
    firstCardHeightPx: SKELETON_FORM_FIELD_HEIGHT_PX,
    stackOffsetPx: 0,
    contentFirstCardTopPx: 731,
    headerChrome: false,
    headerChromeHeightPx: 0,
    filterChrome: false,
    filterChromeHeightPx: 0,
    sectionChrome: false,
    sectionChromeHeightPx: 0,
    padToContentFirstCard: true,
  },
};

/** Documented offset from stack top to first list/detail card top (px), excluding flex gap after chrome blocks. */
export function skeletonFirstCardOffsetPx(preset: SkeletonPagePreset): number {
  const spec = SKELETON_PAGE_PRESETS[preset];
  let offset = spec.stackOffsetPx;
  if (spec.sectionChrome) {
    offset += spec.sectionChromeHeightPx;
  }
  if (spec.headerChrome) {
    offset += spec.headerChromeHeightPx;
  }
  if (spec.filterChrome) {
    offset += spec.filterChromeHeightPx;
  }
  return offset;
}

export type SkeletonE2ERouteCase = {
  name: string;
  path: string | ((ctx: { requestId?: string; appointmentId?: string; providerRequestId?: string }) => string);
  personaKey: string;
  preset: SkeletonPagePreset;
  /** First real content block selector after load (defaults to first `.card` in content). */
  loadedSelector?: string;
  skeletonSelector?: string;
};

/** Seven QA28 M-1 routes measured against `.page-content`. */
export const SKELETON_E2E_ROUTE_CASES: SkeletonE2ERouteCase[] = [
  {
    name: 'requester-bids',
    path: '/requester/bids',
    personaKey: 'req-01',
    preset: 'bids',
  },
  {
    name: 'appointment-detail',
    path: ({ appointmentId }) => `/requester/appointments/${appointmentId ?? 'e2e-placeholder'}`,
    personaKey: 'req-01',
    preset: 'appointment-detail',
  },
  {
    name: 'provider-requests',
    path: '/provider/requests',
    personaKey: 'both-02',
    preset: 'provider-requests',
  },
  {
    name: 'provider-my-bids',
    path: '/provider/my-bids',
    personaKey: 'both-02',
    preset: 'provider-my-bids',
  },
  {
    name: 'provider-request-detail',
    path: ({ providerRequestId }) => `/provider/requests/${providerRequestId ?? 'e2e-placeholder'}`,
    personaKey: 'both-02',
    preset: 'provider-request-detail',
  },
  {
    name: 'provider-coverage',
    path: '/provider/coverage',
    personaKey: 'both-02',
    preset: 'coverage',
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
