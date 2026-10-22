import { Component, inject, input } from '@angular/core';
import { Router, RouterLinkActive } from '@angular/router';
import { DirtyFormGuardState } from './forms/dirty-form.guard';
import { navigateWithDirtyGuard } from './nav-guard';

export type RequesterNavTab = 'home' | 'search' | 'post' | 'bids' | 'account';

@Component({
  selector: 'app-requester-bottom-nav',
  imports: [RouterLinkActive],
  template: `
    <nav class="bnav" aria-label="เมนูผู้รับบริการ">
      <a
        href="/requester"
        routerLinkActive="on"
        [routerLinkActiveOptions]="{ exact: true }"
        (click)="go($event, '/requester')"
      >
        <i aria-hidden="true">🏠</i>หน้าหลัก
      </a>
      <a href="/requester/search" routerLinkActive="on" (click)="go($event, '/requester/search')">
        <i aria-hidden="true">🔍</i>ค้นหา
      </a>
      <a href="/requester/post" routerLinkActive="on" class="fab" (click)="go($event, '/requester/post')">
        <i aria-hidden="true">➕</i>ประกาศ
      </a>
      <a href="/requester/bids" routerLinkActive="on" (click)="go($event, '/requester/bids')">
        <i aria-hidden="true">💬</i>ข้อเสนอ
      </a>
      <a href="/requester/profile" routerLinkActive="on" (click)="go($event, '/requester/profile')">
        <i aria-hidden="true">👤</i>บัญชี
      </a>
    </nav>
  `,
})
export class RequesterBottomNav {
  readonly active = input<RequesterNavTab | null>(null);

  private readonly router = inject(Router);
  private readonly dirty = inject(DirtyFormGuardState);

  protected async go(event: MouseEvent, url: string): Promise<void> {
    event.preventDefault();
    await navigateWithDirtyGuard(this.router, this.dirty, url);
  }
}
