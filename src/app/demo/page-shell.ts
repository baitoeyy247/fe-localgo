import { Location } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-page-shell',
  imports: [RouterLink],
  template: `
    <section class="app-screen">
      <header class="page-header">
        <div class="page-header__titles">
          <span class="app-mark">LocalGo</span>
          @if (subtitle()) {
            <p class="page-header__subtitle">{{ subtitle() }}</p>
          }
          <h1>{{ title() }}</h1>
        </div>
        @if (showBack()) {
          @if (backLink()) {
            <a class="icon-button" [routerLink]="backLink()!" [attr.aria-label]="backLabel()">
              <span aria-hidden="true">←</span>
            </a>
          } @else {
            <button type="button" class="icon-button" [attr.aria-label]="backLabel()" (click)="goBack()">
              <span aria-hidden="true">←</span>
            </button>
          }
        }
      </header>

      <main class="page-content">
        <ng-content />
      </main>
    </section>
  `,
})
export class PageShell {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly showBack = input(true);
  readonly backLink = input<string | null>(null);
  readonly backLabel = input('กลับ');

  private readonly location = inject(Location);
  private readonly router = inject(Router);

  protected goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigateByUrl('/');
  }
}
