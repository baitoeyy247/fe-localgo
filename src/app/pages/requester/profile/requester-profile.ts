import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PageShell } from '../../../demo/page-shell';
import { RequesterBottomNav } from '../../../shared/requester-bottom-nav';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-requester-profile-page',
  imports: [PageShell, RequesterBottomNav],
  templateUrl: './requester-profile.html',
})
export class RequesterProfilePage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly switching = signal(false);
  protected readonly loggingOut = signal(false);

  protected async switchToProvider(): Promise<void> {
    if (this.switching()) {
      return;
    }
    this.switching.set(true);
    try {
      await this.auth.setActiveRole('Provider');
      await this.router.navigateByUrl('/provider');
    } finally {
      this.switching.set(false);
    }
  }

  protected async logout(): Promise<void> {
    if (this.loggingOut()) {
      return;
    }
    this.loggingOut.set(true);
    this.auth.clearSession();
    this.auth.resetBootstrap();
    await this.router.navigateByUrl('/', { replaceUrl: true });
    this.loggingOut.set(false);
  }
}
