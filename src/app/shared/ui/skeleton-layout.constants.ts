/** QA27 N-2 — skeleton layout targets (CLS proxy). Keep in sync with styles.scss skeleton-stack--*. */

export const SKELETON_STACK_GAP_PX = 12;
export const SKELETON_FORM_FIELD_HEIGHT_PX = 52;

export type SkeletonPagePreset =
  | 'requester-home'
  | 'bids'
  | 'provider-requests'
  | 'provider-my-bids'
  | 'appointment-detail'
  | 'request-detail';

export type SkeletonPresetLayout = {
  count: number;
  variant: 'list' | 'detail' | 'form';
  stackModifier: string;
  /** min-height of the first `.skeleton-card` in the stack (px). */
  firstCardHeightPx: number;
  /** padding-top on `.skeleton-stack` (px) — flow bar / section chrome offset. */
  stackOffsetPx: number;
  /** Optional summary / sec-title block above list cards. */
  headerChrome: boolean;
  /** Height of `.skeleton-header-chrome` when headerChrome is true (px). */
  headerChromeHeightPx: number;
};

export const SKELETON_PAGE_PRESETS: Record<SkeletonPagePreset, SkeletonPresetLayout> = {
  'requester-home': {
    count: 2,
    variant: 'list',
    stackModifier: 'requester-home',
    firstCardHeightPx: 120,
    stackOffsetPx: 0,
    headerChrome: false,
    headerChromeHeightPx: 0,
  },
  bids: {
    count: 2,
    variant: 'list',
    stackModifier: 'bids',
    firstCardHeightPx: 100,
    stackOffsetPx: 0,
    headerChrome: true,
    headerChromeHeightPx: 61,
  },
  'provider-requests': {
    count: 3,
    variant: 'list',
    stackModifier: 'provider-requests',
    firstCardHeightPx: 120,
    stackOffsetPx: 0,
    headerChrome: false,
    headerChromeHeightPx: 0,
  },
  'provider-my-bids': {
    count: 2,
    variant: 'list',
    stackModifier: 'provider-my-bids',
    firstCardHeightPx: 61,
    stackOffsetPx: 0,
    headerChrome: false,
    headerChromeHeightPx: 0,
  },
  'appointment-detail': {
    count: 2,
    variant: 'detail',
    stackModifier: 'appointment-detail',
    firstCardHeightPx: 72,
    stackOffsetPx: 0,
    headerChrome: false,
    headerChromeHeightPx: 0,
  },
  'request-detail': {
    count: 2,
    variant: 'detail',
    stackModifier: 'request-detail',
    firstCardHeightPx: 88,
    stackOffsetPx: 0,
    headerChrome: false,
    headerChromeHeightPx: 0,
  },
};

/** Documented offset from stack top to first list/detail card (px). */
export function skeletonFirstCardOffsetPx(preset: SkeletonPagePreset): number {
  const spec = SKELETON_PAGE_PRESETS[preset];
  let offset = spec.stackOffsetPx;
  if (spec.headerChrome) {
    offset += spec.headerChromeHeightPx;
  }
  return offset;
}
