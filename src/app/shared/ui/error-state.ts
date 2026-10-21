import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-state',
  template: `
    <div class="state" role="alert">
      <div class="em" aria-hidden="true">⚠️</div>
      <h3>{{ title() }}</h3>
      <p>{{ message() }}</p>
      <button type="button" class="btn btn-primary" (click)="retry.emit()">ลองใหม่</button>
    </div>
  `,
})
export class ErrorState {
  readonly title = input('โหลดข้อมูลไม่สำเร็จ');
  readonly message = input('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
  readonly retry = output<void>();
}
