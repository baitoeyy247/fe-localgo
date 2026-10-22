import { Location } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-page-shell',
  imports: [RouterLink],
  template: `
    <div class="app" [class.no-nav]="hideNavPad()">
      @if (hero()) {
        <div class="hero">
          <div class="hero__top">
            @if (showBack()) {
              @if (backCommands()) {
                <a
                  class="icon-btn hero__back"
                  [routerLink]="backCommands()!"
                  [queryParams]="backQueryParams()"
                  [attr.aria-label]="backLabel()"
                  >←</a
                >
              } @else if (backLink()) {
                <a class="icon-btn hero__back" [routerLink]="backLink()!" [attr.aria-label]="backLabel()">←</a>
              } @else {
                <button type="button" class="icon-btn hero__back" [attr.aria-label]="backLabel()" (click)="goBack()">
                  ←
                </button>
              }
            }
            <span class="app-mark app-mark--on-hero">LocalGo</span>
          </div>
          <h1>{{ title() }}</h1>
          @if (subtitle()) {
            <p>{{ subtitle() }}</p>
          }
        </div>
      } @else {
        <header class="hdr" [class.green]="greenHeader()">
          @if (showBack()) {
            @if (backCommands()) {
              <a
                class="icon-btn"
                [routerLink]="backCommands()!"
                [queryParams]="backQueryParams()"
                [attr.aria-label]="backLabel()"
                >←</a
              >
            } @else if (backLink()) {
              <a class="icon-btn" [routerLink]="backLink()!" [attr.aria-label]="backLabel()">←</a>
            } @else {
              <button type="button" class="icon-btn" [attr.aria-label]="backLabel()" (click)="goBack()">←</button>
            }
          }
          <h1>{{ title() }}</h1>
          <span class="app-mark" [class.app-mark--on-hero]="greenHeader()">LocalGo</span>
        </header>
      }

      <main class="content page-content">
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

  private readonly location = inject(Location);

  protected buildLabel(): string {
    const sha = (environment as { buildSha?: string }).buildSha ?? 'dev';
    return `build ${sha.slice(0, 7)}`;
  }
  private readonly router = inject(Router);

  protected goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigateByUrl('/');
  }
}
