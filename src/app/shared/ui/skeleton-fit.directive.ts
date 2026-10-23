import { Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';

/**
 * R40/R41 M-1: remember where/how tall the first real card was (per route + viewport width, localStorage)
 * and make the first skeleton card occupy exactly that box on the next load (|Δtop|, |Δh| ≈ 0).
 */
type FitBox = { top: number; h: number };

function fitKey(): string {
  return `lg.fit:${location.pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, ":id")}:${window.innerWidth}`;
}

function readFit(): FitBox | null {
  try {
    const raw = localStorage.getItem(fitKey());
    const v = raw ? (JSON.parse(raw) as FitBox) : null;
    return v && Number.isFinite(v.top) && Number.isFinite(v.h) && v.h > 0 ? v : null;
  } catch {
    return null;
  }
}

function docTop(el: HTMLElement): number {
  return el.getBoundingClientRect().top + window.scrollY;
}

/** Put on the first real card (`[lgFitSource]="$first"`). */
@Directive({ selector: '[lgFitSource]' })
export class FitSourceDirective {
  readonly lgFitSource = input<boolean | ''>(true);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterNextRender(() => {
      const on = this.lgFitSource();
      if (on === false) {
        return;
      }
      // Wait one frame so fonts/layout settle before measuring.
      requestAnimationFrame(() => {
        const node = this.el.nativeElement;
        const h = Math.round(node.getBoundingClientRect().height);
        if (h <= 0) {
          return;
        }
        try {
          localStorage.setItem(fitKey(), JSON.stringify({ top: Math.round(docTop(node)), h }));
        } catch {
          /* ignore */
        }
      });
    });
  }
}

/** Put on the first skeleton card. */
@Directive({ selector: '[lgFitTarget]' })
export class FitTargetDirective {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterNextRender(() => {
      const fit = readFit();
      if (!fit) {
        return;
      }
      const node = this.el.nativeElement;
      // R41: .skeleton-card--ghost sets height/min/max with !important, so inline must be !important too.
      node.style.setProperty('box-sizing', 'border-box', 'important');
      node.style.setProperty('height', `${fit.h}px`, 'important');
      node.style.setProperty('min-height', `${fit.h}px`, 'important');
      node.style.setProperty('max-height', `${fit.h}px`, 'important');
      node.style.setProperty('overflow', 'hidden', 'important');
      const dy = Math.round(fit.top - docTop(node));
      if (Math.abs(dy) > 1 && Math.abs(dy) < 600) {
        const mt = Number.parseFloat(getComputedStyle(node).marginTop) || 0;
        node.style.marginTop = `${mt + dy}px`;
      }
    });
  }
}
