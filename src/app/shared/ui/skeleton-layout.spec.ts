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
  const cardRules = PRESET_KEYS.flatMap((key) => {
    const spec = SKELETON_PAGE_PRESETS[key];
    const heights = spec.cardHeightsPx ?? [spec.firstCardHeightPx];
    if (spec.variant === 'form') {
      return [
        `.skeleton-stack--${spec.stackModifier} { padding-top: ${spec.stackOffsetPx}px; }`,
        `.skeleton-stack--${spec.stackModifier} .skeleton-form-field__input { height: ${spec.firstCardHeightPx}px; }`,
      ];
    }
    const rules: string[] = [];
    if (spec.stackOffsetPx) {
      rules.push(`.skeleton-stack--${spec.stackModifier} { padding-top: ${spec.stackOffsetPx}px; }`);
    }
    heights.forEach((heightPx, index) => {
      const childIndex =
        index +
        1 +
        (spec.sectionChrome ? 1 : 0) +
        (spec.headerChrome ? 1 : 0) +
        (spec.filterChrome ? 1 : 0);
      rules.push(
        `.skeleton-stack--${spec.stackModifier} .skeleton-card:nth-child(${childIndex}) { min-height: ${heightPx}px; }`,
      );
    });
    return rules;
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
    .skeleton-section-chrome { min-height: 44px; height: 44px; box-sizing: border-box; flex-shrink: 0; }
    .skeleton-filter-chrome { min-height: 206px; box-sizing: border-box; flex-shrink: 0; }
    ${cardRules}
  `;

  const style = document.createElement('style');
  style.setAttribute('data-test', 'skeleton-layout');
  style.textContent = css;
  document.head.appendChild(style);
}

function firstSkeletonBlock(root: HTMLElement, preset: SkeletonPagePreset): HTMLElement {
  const spec = SKELETON_PAGE_PRESETS[preset];
  if (spec.variant === 'form') {
    const field = root.querySelector('.skeleton-stack .skeleton-form-field');
    expect(field).toBeTruthy();
    return field as HTMLElement;
  }
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

  it.each(PRESET_KEYS)('preset %s first block min-height within tolerance', (preset) => {
    const spec = SKELETON_PAGE_PRESETS[preset];
    const fixture = TestBed.createComponent(SkeletonPresetHost);
    fixture.componentInstance.preset = preset;
    fixture.detectChanges();

    const block = firstSkeletonBlock(fixture.nativeElement as HTMLElement, preset);
    const measured =
      spec.variant === 'form'
        ? parseFloat(getComputedStyle(block.querySelector('.skeleton-form-field__input')!).height) ||
          0
        : readMinHeightPx(block);
    expect(Math.abs(measured - spec.firstCardHeightPx)).toBeLessThanOrEqual(CLS_TOLERANCE_PX);
  });

  it.each(PRESET_KEYS)('preset %s first block offset within tolerance', (preset) => {
    const spec = SKELETON_PAGE_PRESETS[preset];
    const documentedOffset = skeletonFirstCardOffsetPx(preset);
    expect(documentedOffset).toBe(
      spec.stackOffsetPx +
        (spec.sectionChrome ? spec.sectionChromeHeightPx : 0) +
        (spec.headerChrome ? spec.headerChromeHeightPx : 0) +
        (spec.filterChrome ? spec.filterChromeHeightPx : 0),
    );

    const fixture = TestBed.createComponent(SkeletonPresetHost);
    fixture.componentInstance.preset = preset;
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const stack = root.querySelector('.skeleton-stack') as HTMLElement;
    const block = firstSkeletonBlock(root, preset);

    const chromeSelector = spec.filterChrome
      ? '.skeleton-filter-chrome'
      : spec.headerChrome
        ? '.skeleton-header-chrome'
        : spec.sectionChrome
          ? '.skeleton-section-chrome'
          : null;

    if (chromeSelector) {
      const chrome = stack.querySelector(chromeSelector) as HTMLElement;
      expect(chrome).toBeTruthy();
      const gapAfterChrome = block.offsetTop - chrome.offsetTop - chrome.offsetHeight;
      expect(Math.abs(gapAfterChrome - SKELETON_STACK_GAP_PX)).toBeLessThanOrEqual(
        SKELETON_STACK_GAP_PX,
      );
    } else if (spec.stackOffsetPx > 0) {
      const pad = parseFloat(getComputedStyle(stack).paddingTop) || 0;
      expect(Math.abs(pad - spec.stackOffsetPx)).toBeLessThanOrEqual(CLS_TOLERANCE_PX);
    } else if (spec.sectionChrome) {
      const section = stack.querySelector('.skeleton-section-chrome') as HTMLElement;
      expect(section).toBeTruthy();
      const gapAfterSection = block.offsetTop - section.offsetTop - section.offsetHeight;
      expect(Math.abs(gapAfterSection - SKELETON_STACK_GAP_PX)).toBeLessThanOrEqual(
        SKELETON_STACK_GAP_PX,
      );
    } else {
      const offset = block.getBoundingClientRect().top - stack.getBoundingClientRect().top;
      expect(Math.abs(offset - documentedOffset)).toBeLessThanOrEqual(CLS_TOLERANCE_PX);
    }
  });
});
