import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-provider-bottom-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="bnav" aria-label="เมนูผู้ให้บริการ">
      <a routerLink="/provider" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">
        <i aria-hidden="true">🏠</i>หน้าหลัก
      </a>
      <a routerLink="/provider/manage" routerLinkActive="on">
        <i aria-hidden="true">🛠</i>บริการ
      </a>
      <a routerLink="/provider/requests" routerLinkActive="on">
        <i aria-hidden="true">📋</i>งาน
      </a>
      <a routerLink="/provider/profile" routerLinkActive="on">
        <i aria-hidden="true">👤</i>โปรไฟล์
      </a>
    </nav>
  `,
})
export class ProviderBottomNav {}
