import { NgClass } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import {
  SKELETON_PAGE_PRESETS,
  SKELETON_STACK_GAP_PX,
  skeletonFirstCardOffsetPx,
  type SkeletonPagePreset,
} from './skeleton-layout.constants';

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
      @if (slow()) {
        <p class="muted" style="text-align: center" role="status">กำลังเชื่อมต่อเซิร์ฟเวอร์…</p>
      }
      <div class="skeleton-stack" [ngClass]="stackClasses()" [style]="stackStyle()">
        @if (showSectionChrome()) {
          <div class="skeleton-section-chrome" aria-hidden="true">
            <div class="skel skeleton-section-chrome__title"></div>
            <div class="skel skeleton-section-chrome__action"></div>
          </div>
        }
        @if (showHeaderChrome()) {
          <div class="skeleton-header-chrome" aria-hidden="true">
            <div class="skel skeleton-header-chrome__title"></div>
            <div class="skel skeleton-header-chrome__line"></div>
          </div>
        }
        @if (showFilterChrome()) {
          <div
            class="skeleton-filter-chrome"
            [class.skeleton-filter-chrome--chips]="filterChromeMode() === 'chips'"
            aria-hidden="true"
          >
            @if (filterChromeMode() !== 'chips') {
              <div class="skel skeleton-filter-chrome__banner"></div>
              <p class="skel skeleton-filter-chrome__hint"></p>
            }
            <div class="skeleton-filter-chrome__chips">
              @for (i of filterChips(); track i) {
                <div class="skel skeleton-filter-chrome__chip"></div>
              }
            </div>
            @if (filterChromeMode() !== 'chips') {
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
              aria-hidden="true"
            >
              <div class="skel" [style.height.px]="effectiveVariant() === 'detail' ? 24 : 20" style="width: 60%"></div>
              <div class="skel" style="height: 14px; margin-top: 12px"></div>
              <div class="skel" style="height: 14px; width: 80%; margin-top: 8px"></div>
              @if (effectiveVariant() === 'detail') {
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
  /** Show the "connecting to server" hint (set after ~3s of loading). */
  readonly slow = input(false);
  /** After ~10s — show retry instead of skeleton. */
  readonly timedOut = input(false);
  /** Page-specific layout (overrides count / variant / topOffset when set). */
  readonly preset = input<SkeletonPagePreset | undefined>(undefined);
  readonly count = input(2);
  readonly variant = input<'list' | 'detail' | 'form'>('list');
  /** Nudge skeleton down to align with real content below flow bars / banners. */
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

  protected readonly showHeaderChrome = computed(() => {
    const p = this.preset();
    return p ? SKELETON_PAGE_PRESETS[p].headerChrome : false;
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
      const spec = SKELETON_PAGE_PRESETS[p];
      classes[`skeleton-stack--${spec.stackModifier}`] = true;
      if (spec.padToContentFirstCard) {
        classes['skeleton-stack--pad-content-first-card'] = true;
      }
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

  protected stackStyle(): Record<string, string> | null {
    const p = this.preset();
    if (!p) {
      return null;
    }
    const spec = SKELETON_PAGE_PRESETS[p];
    if (!spec.padToContentFirstCard) {
      return null;
    }
    const chromeAboveCard = skeletonFirstCardOffsetPx(p as SkeletonPagePreset);
    const gapBeforeCard = chromeAboveCard > 0 ? SKELETON_STACK_GAP_PX : 0;
    const pad = Math.max(0, spec.contentFirstCardTopPx - chromeAboveCard - gapBeforeCard);
    return { '--sk-content-first-card-top': `${pad}px` };
  }
}
