import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type ProviderSetupStep = 'profile' | 'coverage' | 'service';

@Component({
  selector: 'app-provider-setup-bar',
  template: `
    <nav class="setup-bar" aria-label="ตั้งค่าผู้ให้บริการ">
      <a class="setup-bar__step" [class.is-active]="active() === 'profile'" routerLink="/provider/profile">
        <span>1</span> โปรไฟล์
      </a>
      <a class="setup-bar__step" [class.is-active]="active() === 'coverage'" routerLink="/provider/coverage">
        <span>2</span> พื้นที่
      </a>
      <a class="setup-bar__step" [class.is-active]="active() === 'service'" routerLink="/provider/service">
        <span>3</span> บริการ
      </a>
    </nav>
  `,
  imports: [RouterLink],
})
export class ProviderSetupBar {
  readonly active = input.required<ProviderSetupStep>();
}
