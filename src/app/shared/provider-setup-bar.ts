import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GLOSSARY } from './glossary';

export type ProviderSetupStep = 'profile' | 'coverage' | 'service';

@Component({
  selector: 'app-provider-setup-bar',
  template: `
    <nav class="flow" aria-label="ตั้งค่าผู้ให้บริการ">
      <a class="flow__link" [class.on]="active() === 'profile'" routerLink="/provider/profile">
        <b>1</b>โปรไฟล์
      </a>
      <a class="flow__link" [class.on]="active() === 'coverage'" routerLink="/provider/coverage">
        <b>2</b>{{ GLOSSARY.coverageAreaTitle }}
      </a>
      <a class="flow__link" [class.on]="active() === 'service'" routerLink="/provider/service">
        <b>3</b>บริการ
      </a>
    </nav>
  `,
  imports: [RouterLink],
})
export class ProviderSetupBar {
  protected readonly GLOSSARY = GLOSSARY;
  readonly active = input.required<ProviderSetupStep>();
}
