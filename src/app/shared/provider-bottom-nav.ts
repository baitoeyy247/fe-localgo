import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-provider-bottom-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="bottom-nav" aria-label="เมนูผู้ให้บริการ">
      <a routerLink="/provider" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }">
        <span aria-hidden="true">🏠</span>หน้าหลัก
      </a>
      <a routerLink="/provider/manage" routerLinkActive="is-active">
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
export class ProviderBottomNav {}
