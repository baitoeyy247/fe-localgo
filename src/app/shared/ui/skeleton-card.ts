import { NgClass } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { SKELETON_PAGE_PRESETS, type SkeletonPagePreset } from './skeleton-layout.constants';

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  imports: [NgClass],
  template: `
    @if (timedOut()) {
      <div class="state" role="alert">
        <div class="em">⏳</div>
        <h3>โหลดนานเกินไป</h3>
        <p>เกิน 10 วินาทีแล้ว ลองใหม่อีกครั้ง</p>
        <button type="button" class="btn btn-primary" (click)="retry.emit()">ลองใหม่</button>
      </div>
    } @else {
      <div class="skeleton-stack" [ngClass]="stackClasses()" role="status" aria-live="polite">
        <span class="sr-only">กำลังโหลด…</span>
        @if (showFlowChrome()) {
          <div class="skeleton-flow-chrome" aria-hidden="true">
            @for (i of flowSteps(); track i) {
              <div class="skel skeleton-flow-chrome__step"></div>
            }
          </div>
        }
        @if (showRequestSummaryChrome()) {
          <div class="skeleton-request-summary" aria-hidden="true">
            <div class="skel skeleton-request-summary__title"></div>
            <div class="skel skeleton-request-summary__line"></div>
          </div>
        }
        @if (showSectionChrome()) {
          <div class="skeleton-section-chrome" aria-hidden="true">
            <div class="skel skeleton-section-chrome__title"></div>
            <div class="skel skeleton-section-chrome__action"></div>
          </div>
        }
        @if (showHeaderChrome()) {
          <div
            class="skeleton-header-chrome"
            [class.skeleton-header-chrome--sec-title]="headerChromeVariant() === 'sec-title'"
            aria-hidden="true"
          >
            <div class="skel skeleton-header-chrome__title"></div>
            @if (headerChromeVariant() !== 'sec-title') {
              <div class="skel skeleton-header-chrome__line"></div>
            }
          </div>
        }
        @if (showFilterChrome()) {
          <div
            class="skeleton-filter-chrome"
            [class.skeleton-filter-chrome--chips]="filterChromeMode() === 'chips'"
            [class.skeleton-filter-chrome--provider-inbox]="filterChromeMode() === 'inbox'"
            aria-hidden="true"
          >
            @if (filterChromeMode() === 'inbox') {
              <div class="skel skeleton-filter-chrome__banner"></div>
              <p class="skel skeleton-filter-chrome__hint"></p>
            }
            <div class="skeleton-filter-chrome__chips">
              @for (i of filterChips(); track i) {
                <div class="skel skeleton-filter-chrome__chip"></div>
              }
            </div>
            @if (filterChromeMode() === 'inbox') {
              <div class="skel skeleton-filter-chrome__sec-title"></div>
            }
          </div>
        }
        @if (effectiveVariant() === 'form') {
          @for (i of formFields(); track i) {
            <div class="skeleton-form-field" aria-hidden="true">
              <div class="skel skeleton-form-field__label"></div>
              <div class="skel skeleton-form-field__input"></div>
            </div>
          }
          <div class="skel skeleton-form-field__button" aria-hidden="true"></div>
        } @else {
          @for (i of items(); track i) {
            <div
              class="card skeleton-card"
              [class.skeleton-card--map]="mapCardIndex() === i"
              [style.min-height.px]="cardHeightPx(i)"
              aria-hidden="true"
            >
              @if (effectiveVariant() === 'detail' && i === 0) {
                <div class="skel" style="height: 18px; width: 62%"></div>
                <div class="skel" style="height: 14px; width: 42%; margin-top: 8px"></div>
              } @else {
                <div class="skel" [style.height.px]="effectiveVariant() === 'detail' ? 24 : 20" style="width: 60%"></div>
                <div class="skel" style="height: 14px; margin-top: 12px"></div>
                <div class="skel" style="height: 14px; width: 80%; margin-top: 8px"></div>
              }
              @if (effectiveVariant() === 'detail' && i > 0) {
                <div class="skel skeleton-card__detail-block" style="height: 120px; width: 100%; margin-top: 12px; border-radius: 12px"></div>
              }
              @if (mapCardIndex() === i) {
                <div class="skel skeleton-card__map" aria-hidden="true"></div>
              }
            </div>
          }
        }
      </div>
    }
  `,
})
export class SkeletonCard {
  readonly slow = input(false);
  readonly timedOut = input(false);
  readonly preset = input<SkeletonPagePreset | undefined>(undefined);
  readonly count = input(2);
  readonly variant = input<'list' | 'detail' | 'form'>('list');
  readonly topOffset = input(false);
  readonly retry = output<void>();

  protected readonly effectiveCount = computed(() => {
    const p = this.preset();
    return p ? SKELETON_PAGE_PRESETS[p].count : this.count();
  });

  protected readonly effectiveVariant = computed(() => {
    const p = this.preset();
    return p ? SKELETON_PAGE_PRESETS[p].variant : this.variant();
  });

  protected readonly showFlowChrome = computed(() => {
    const p = this.preset();
    return p ? SKELETON_PAGE_PRESETS[p].flowChrome : false;
  });

  protected readonly showRequestSummaryChrome = computed(() => {
    const p = this.preset();
    return p ? SKELETON_PAGE_PRESETS[p].requestSummaryChrome : false;
  });

  protected readonly showHeaderChrome = computed(() => {
    const p = this.preset();
    return p ? SKELETON_PAGE_PRESETS[p].headerChrome : false;
  });

  protected readonly headerChromeVariant = computed(() => {
    const p = this.preset();
    return p ? (SKELETON_PAGE_PRESETS[p].headerChromeVariant ?? 'card') : 'card';
  });

  protected readonly showFilterChrome = computed(() => {
    const p = this.preset();
    return p ? SKELETON_PAGE_PRESETS[p].filterChrome : false;
  });

  protected readonly filterChromeMode = computed(() => {
    const p = this.preset();
    return p ? (SKELETON_PAGE_PRESETS[p].filterChromeMode ?? 'inbox') : 'inbox';
  });

  protected readonly showSectionChrome = computed(() => {
    const p = this.preset();
    return p ? SKELETON_PAGE_PRESETS[p].sectionChrome : false;
  });

  protected readonly mapCardIndex = computed(() => {
    const p = this.preset();
    return p === 'coverage' ? 0 : -1;
  });

  protected stackClasses(): Record<string, boolean> {
    const p = this.preset();
    const variant = this.effectiveVariant();
    const classes: Record<string, boolean> = {
      'skeleton-stack--detail': variant === 'detail',
      'skeleton-stack--form': variant === 'form',
    };
    if (p) {
      classes[`skeleton-stack--${SKELETON_PAGE_PRESETS[p].stackModifier}`] = true;
    } else if (this.topOffset()) {
      classes['skeleton-stack--top-offset'] = true;
    }
    return classes;
  }

  protected items(): number[] {
    return Array.from({ length: this.effectiveCount() }, (_, i) => i);
  }

  protected formFields(): number[] {
    return [0, 1, 2, 3, 4];
  }

  protected filterChips(): number[] {
    return [0, 1, 2, 3];
  }

  protected flowSteps(): number[] {
    return [0, 1, 2, 3];
  }

  protected cardHeightPx(index: number): number | null {
    const p = this.preset();
    if (!p) {
      return null;
    }
    const spec = SKELETON_PAGE_PRESETS[p];
    const heights = spec.cardHeightsPx;
    if (heights?.[index] != null) {
      return heights[index];
    }
    if (index === 0) {
      return spec.firstCardHeightPx;
    }
    return null;
  }
}
