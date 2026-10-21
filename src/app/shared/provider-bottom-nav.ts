import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-provider-bottom-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="bottom-nav" aria-label="เมนูผู้ให้บริการ">
      <a routerLink="/provider" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }">
        <span aria-hidden="true">🏠</span>หน้าหลัก
      </a>
      <a routerLink="/provider/manage" [class.is-active]="servicesActive()">
        <span aria-hidden="true">🛠</span>บริการ
      </a>
      <a routerLink="/provider/requests" routerLinkActive="is-active">
        <span aria-hidden="true">📋</span>งาน
      </a>
      <a routerLink="/provider/profile" routerLinkActive="is-active">
        <span aria-hidden="true">👤</span>โปรไฟล์
      </a>
    </nav>
  `,
})
export class ProviderBottomNav {
  private readonly router = inject(Router);

  protected servicesActive(): boolean {
    const path = this.router.url.split('?')[0];
    return (
      path.startsWith('/provider/manage') ||
      path.startsWith('/provider/service') ||
      path.startsWith('/provider/coverage')
    );
  }
}
