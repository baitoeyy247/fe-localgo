import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthService } from './auth.service';

@Component({ standalone: true, template: 'home' })
class HomeStub {}

@Component({ standalone: true, template: 'admin' })
class AdminStub {}

describe('adminGuard', () => {
  it('sends a normal user away from /admin', async () => {
    const auth = {
      ensureSession: () => Promise.resolve(),
      isAdmin: () => false,
    };
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: HomeStub },
          { path: 'admin', canActivate: [adminGuard], component: AdminStub },
        ]),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin');
    expect(router.url).toContain('denied=admin');
    expect(router.url.startsWith('/admin')).toBe(false);
  });

  it('allows an admin through', async () => {
    const auth = {
      ensureSession: () => Promise.resolve(),
      isAdmin: () => true,
    };
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: HomeStub },
          { path: 'admin', canActivate: [adminGuard], component: AdminStub },
        ]),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin');
    expect(router.url).toBe('/admin');
  });
});
