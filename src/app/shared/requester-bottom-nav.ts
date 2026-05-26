import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export type RequesterNavTab = 'home' | 'search' | 'post' | 'bids';

@Component({
  selector: 'app-requester-bottom-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="bottom-nav" aria-label="เมนูผู้รับบริการ">
      <a routerLink="/requester" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }">
        <span aria-hidden="true">🏠</span>หน้าหลัก
      </a>
      <a routerLink="/requester/search" routerLinkActive="is-active">
        <span aria-hidden="true">🔍</span>ค้นหา
      </a>
      <a routerLink="/requester/post" routerLinkActive="is-active">
        <span aria-hidden="true">📢</span>ประกาศ
      </a>
      <a routerLink="/requester/bids" routerLinkActive="is-active">
        <span aria-hidden="true">💬</span>ข้อเสนอ
      </a>
    </nav>
  `,
})
export class RequesterBottomNav {
  readonly active = input<RequesterNavTab | null>(null);
}
