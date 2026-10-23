import { Location } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { DirtyFormGuardState } from '../shared/forms/dirty-form.guard';
import { navigateWithDirtyGuard } from '../shared/nav-guard';

@Component({
  selector: 'app-page-shell',
  template: `
    <div class="app" [class.no-nav]="hideNavPad()">
      @if (hero()) {
        <div class="hero">
          <div class="hero__top">
            @if (showBack()) {
              <button
                type="button"
                class="icon-btn hero__back"
                [attr.aria-label]="backLabel()"
                (click)="onBack()"
              >
                ←
              </button>
            }
            <span class="app-mark app-mark--on-hero">LocalGo</span>
          </div>
          <h1 tabindex="-1" class="page-h1">{{ title() }}</h1>
          @if (subtitle()) {
            <p>{{ subtitle() }}</p>
          }
        </div>
      } @else {
        <header class="hdr" [class.green]="greenHeader()">
          @if (showBack()) {
            <button type="button" class="icon-btn" [attr.aria-label]="backLabel()" (click)="onBack()">←</button>
          }
          <h1 tabindex="-1" class="page-h1">{{ title() }}</h1>
          <span class="app-mark" [class.app-mark--on-hero]="greenHeader()">LocalGo</span>
        </header>
      }

      <main class="content page-content" [attr.aria-busy]="busy() === null ? null : busy() ? 'true' : 'false'">
        <ng-content />
      </main>
      @if (showBuildInfo()) {
        <footer class="build-footer muted" aria-label="เวอร์ชัน build">{{ buildLabel() }}</footer>
      }
    </div>
  `,
})
export class PageShell {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly showBack = input(true);
  readonly backLink = input<string | null>(null);
  /** Prefer over backLink when query params are needed (avoids `?` encoding bugs). */
  readonly backCommands = input<unknown[] | null>(null);
  readonly backQueryParams = input<Record<string, string> | null>(null);
  readonly backLabel = input('กลับ');
  /** Green hero band (mockup). */
  readonly hero = input(false);
  readonly greenHeader = input(false);
  /** Skip bottom-nav padding (entry / sheets). */
  readonly hideNavPad = input(false);
  readonly showBuildInfo = input(true);
  /** R44 A5-20: aria-busy on the main container while the page skeleton is shown. */
  readonly busy = input<boolean | null>(null);

  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly dirty = inject(DirtyFormGuardState);

  protected buildLabel(): string {
    const sha = (environment as { buildSha?: string }).buildSha ?? 'dev';
    return `build ${sha.slice(0, 7)}`;
  }

  protected async onBack(): Promise<void> {
    const commands = this.backCommands();
    const link = this.backLink();
    if (commands?.length) {
      await navigateWithDirtyGuard(this.router, this.dirty, commands, this.backQueryParams() ?? undefined);
      return;
    }
    if (link) {
      await navigateWithDirtyGuard(this.router, this.dirty, link);
      return;
    }
    if (!(await this.dirty.confirmDiscard())) {
      return;
    }
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    await this.router.navigateByUrl('/');
  }
}
