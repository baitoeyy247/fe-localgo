import { beforeEach, describe, expect, it } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SkeletonCard } from './skeleton-card';
import {
  SKELETON_PAGE_PRESETS,
  SKELETON_STACK_GAP_PX,
  type SkeletonPagePreset,
  skeletonFirstCardOffsetPx,
} from './skeleton-layout.constants';

const CLS_TOLERANCE_PX = 8;

const PRESET_KEYS = Object.keys(SKELETON_PAGE_PRESETS) as SkeletonPagePreset[];

@Component({
  standalone: true,
  imports: [SkeletonCard],
  template: `<app-skeleton-card [preset]="preset" />`,
})
class SkeletonPresetHost {
  preset!: SkeletonPagePreset;
}

function injectSkeletonLayoutStyles(): void {
  const rules = PRESET_KEYS.map((key) => {
    const spec = SKELETON_PAGE_PRESETS[key];
    return `.skeleton-stack--${spec.stackModifier} .skeleton-card { min-height: ${spec.firstCardHeightPx}px; }`;
  }).join('\n');

  const css = `
    .skeleton-stack {
      display: flex;
      flex-direction: column;
      gap: ${SKELETON_STACK_GAP_PX}px;
      position: relative;
    }
    .skeleton-stack--detail .skeleton-card { min-height: 180px; }
    .skeleton-header-chrome { min-height: 61px; height: 61px; box-sizing: border-box; flex-shrink: 0; }
    .skeleton-stack--bids .skeleton-header-chrome { min-height: 61px; height: 61px; }
    ${PRESET_KEYS.map((key) => {
      const spec = SKELETON_PAGE_PRESETS[key];
      if (!spec.stackOffsetPx) return '';
      return `.skeleton-stack--${spec.stackModifier} { padding-top: ${spec.stackOffsetPx}px; }`;
    }).join('\n')}
    ${rules}
  `;

  const style = document.createElement('style');
  style.setAttribute('data-test', 'skeleton-layout');
  style.textContent = css;
  document.head.appendChild(style);
}

function firstSkeletonCard(root: HTMLElement): HTMLElement {
  const card = root.querySelector('.skeleton-stack .skeleton-card');
  expect(card).toBeTruthy();
  return card as HTMLElement;
}

function readMinHeightPx(el: HTMLElement): number {
  return parseFloat(getComputedStyle(el).minHeight) || 0;
}

describe('SkeletonCard page presets (CLS proxy)', () => {
  beforeEach(async () => {
    TestBed.resetTestingModule();
    document.querySelector('style[data-test="skeleton-layout"]')?.remove();
    injectSkeletonLayoutStyles();
    await TestBed.configureTestingModule({
      imports: [SkeletonPresetHost],
    }).compileComponents();
  });

  it.each(PRESET_KEYS)('preset %s first card min-height within tolerance', (preset) => {
    const spec = SKELETON_PAGE_PRESETS[preset];
    const fixture = TestBed.createComponent(SkeletonPresetHost);
    fixture.componentInstance.preset = preset;
    fixture.detectChanges();

    const card = firstSkeletonCard(fixture.nativeElement as HTMLElement);
    expect(Math.abs(readMinHeightPx(card) - spec.firstCardHeightPx)).toBeLessThanOrEqual(CLS_TOLERANCE_PX);
  });

  it.each(PRESET_KEYS)('preset %s first card offset within tolerance', (preset) => {
    const spec = SKELETON_PAGE_PRESETS[preset];
    const documentedOffset = skeletonFirstCardOffsetPx(preset);
    expect(documentedOffset).toBe(
      spec.stackOffsetPx + (spec.headerChrome ? spec.headerChromeHeightPx : 0),
    );

    const fixture = TestBed.createComponent(SkeletonPresetHost);
    fixture.componentInstance.preset = preset;
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const stack = root.querySelector('.skeleton-stack') as HTMLElement;
    const card = firstSkeletonCard(root);
    if (spec.headerChrome) {
      const header = stack.querySelector('.skeleton-header-chrome') as HTMLElement;
      expect(header).toBeTruthy();
      const headerHeight = parseFloat(getComputedStyle(header).height) || header.offsetHeight;
      expect(Math.abs(headerHeight - spec.headerChromeHeightPx)).toBeLessThanOrEqual(CLS_TOLERANCE_PX);
      const gapAfterHeader = card.offsetTop - header.offsetTop - header.offsetHeight;
      expect(Math.abs(gapAfterHeader - SKELETON_STACK_GAP_PX)).toBeLessThanOrEqual(
        SKELETON_STACK_GAP_PX,
      );
    } else {
      const offset =
        card.getBoundingClientRect().top - stack.getBoundingClientRect().top;
      expect(Math.abs(offset - documentedOffset)).toBeLessThanOrEqual(CLS_TOLERANCE_PX);
    }
  });
});
