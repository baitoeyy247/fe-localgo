import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class PageTitleService {
  private readonly title = inject(Title);

  set(page: string): void {
    this.title.setTitle(page ? `${page} | LocalGo` : 'LocalGo');
  }
}
