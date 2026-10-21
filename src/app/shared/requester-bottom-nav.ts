import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export type RequesterNavTab = 'home' | 'search' | 'post' | 'bids';

@Component({
  selector: 'app-requester-bottom-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="bnav" aria-label="เมนูผู้รับบริการ">
      <a
        routerLink="/requester"
        routerLinkActive="on"
        [routerLinkActiveOptions]="{ exact: true }"
        [attr.aria-current]="null"
      >
        <i aria-hidden="true">🏠</i>หน้าหลัก
      </a>
      <a routerLink="/requester/search" routerLinkActive="on">
        <i aria-hidden="true">🔍</i>ค้นหา
      </a>
      <a routerLink="/requester/post" routerLinkActive="on" class="fab">
        <i aria-hidden="true">➕</i>ประกาศ
      </a>
      <a routerLink="/requester/bids" routerLinkActive="on">
        <i aria-hidden="true">💬</i>ข้อเสนอ
      </a>
    </nav>
  `,
})
export class RequesterBottomNav {
  readonly active = input<RequesterNavTab | null>(null);
}
