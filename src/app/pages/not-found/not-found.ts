import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageShell } from '../../demo/page-shell';
import { AuthService } from '../../core/auth.service';
import { PageTitleService } from '../../shared/title.service';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, PageShell],
  template: `
    <app-page-shell title="ไม่พบหน้า" [showBack]="false" [hideNavPad]="true">
      <div class="state">
        <div class="em" aria-hidden="true">🧭</div>
        <h3>ไม่พบหน้าที่ต้องการ</h3>
        <p>ลิงก์อาจไม่ถูกต้องหรือหน้านี้ถูกลบไปแล้ว</p>
        <a class="btn btn-primary btn-block" [routerLink]="homeLink()">กลับ{{ homeLabel() }}</a>
        <a class="btn btn-ghost btn-block" routerLink="/">หน้าเริ่มต้น</a>
      </div>
    </app-page-shell>
  `,
})
export class NotFoundPage implements OnInit {
  private readonly titles = inject(PageTitleService);
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    this.titles.set('ไม่พบหน้า');
  }

  protected homeLink(): string {
    const role = this.auth.activeRole();
    if (role === 'Provider') {
      return '/provider';
    }
    if (this.auth.isAdmin()) {
      return '/admin';
    }
    if (this.auth.isAuthenticated()) {
      return '/requester';
    }
    return '/';
  }

  protected homeLabel(): string {
    const role = this.auth.activeRole();
    if (role === 'Provider') {
      return 'หน้าหลักผู้ให้บริการ';
    }
    if (this.auth.isAdmin()) {
      return 'หลังบ้านแอดมิน';
    }
    if (this.auth.isAuthenticated()) {
      return 'หน้าหลักผู้รับบริการ';
    }
    return 'หน้าแรก';
  }
}
