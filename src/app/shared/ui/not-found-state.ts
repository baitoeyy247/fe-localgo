import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Inline 404 UI for detail pages whose resource does not exist. */
@Component({
  selector: 'app-not-found-state',
  imports: [RouterLink],
  template: `
    <div class="state" role="alert">
      <div class="em" aria-hidden="true">🔍</div>
      <h3>{{ title() }}</h3>
      <p>{{ message() }}</p>
      <a class="btn btn-primary" [routerLink]="backLink()">{{ backLabel() }}</a>
    </div>
  `,
})
export class NotFoundState {
  readonly title = input('ไม่พบข้อมูล');
  readonly message = input('ไม่พบรายการนี้ หรือรายการถูกลบแล้ว');
  readonly backLink = input('/');
  readonly backLabel = input('กลับหน้าแรก');
}
