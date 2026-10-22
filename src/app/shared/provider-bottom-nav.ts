import { Component, inject } from '@angular/core';
import { Router, RouterLinkActive } from '@angular/router';
import { DirtyFormGuardState } from './forms/dirty-form.guard';
import { navigateWithDirtyGuard } from './nav-guard';

@Component({
  selector: 'app-provider-bottom-nav',
  imports: [RouterLinkActive],
  template: `
    <nav class="bnav" aria-label="เมนูผู้ให้บริการ">
      <a
        href="/provider"
        routerLinkActive="on"
        [routerLinkActiveOptions]="{ exact: true }"
        (click)="go($event, '/provider')"
      >
        <i aria-hidden="true">🏠</i>หน้าหลัก
      </a>
      <a href="/provider/manage" routerLinkActive="on" (click)="go($event, '/provider/manage')">
        <i aria-hidden="true">🛠</i>บริการ
      </a>
      <a href="/provider/requests" routerLinkActive="on" (click)="go($event, '/provider/requests')">
        <i aria-hidden="true">📋</i>งาน
      </a>
      <a href="/provider/profile" routerLinkActive="on" (click)="go($event, '/provider/profile')">
        <i aria-hidden="true">👤</i>โปรไฟล์
      </a>
    </nav>
  `,
})
export class ProviderBottomNav {
  private readonly router = inject(Router);
  private readonly dirty = inject(DirtyFormGuardState);

  protected async go(event: MouseEvent, url: string): Promise<void> {
    event.preventDefault();
    await navigateWithDirtyGuard(this.router, this.dirty, url);
  }
}
