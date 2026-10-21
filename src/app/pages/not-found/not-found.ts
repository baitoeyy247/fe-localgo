import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageShell } from '../../demo/page-shell';
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
        <a class="btn btn-primary" routerLink="/">กลับหน้าแรก</a>
      </div>
    </app-page-shell>
  `,
})
export class NotFoundPage implements OnInit {
  private readonly titles = inject(PageTitleService);

  ngOnInit(): void {
    this.titles.set('ไม่พบหน้า');
  }
}
