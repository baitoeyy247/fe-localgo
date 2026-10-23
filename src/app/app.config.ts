import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withPreloading } from '@angular/router';

import { routes } from './app.routes';
import { RolePreloadingStrategy } from './core/role-preloading.strategy';
import { authInterceptor } from './core/auth.interceptor';
import { authErrorInterceptor } from './core/auth-error.interceptor';
import { httpTimeoutInterceptor } from './core/http-timeout.interceptor';
import { ngrokInterceptor } from './core/ngrok.interceptor';
import { httpConsoleLogInterceptor } from './core/http-console-log.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(
      withInterceptors([httpConsoleLogInterceptor, httpTimeoutInterceptor, ngrokInterceptor, authInterceptor, authErrorInterceptor]),
    ),
    provideRouter(routes, withPreloading(RolePreloadingStrategy)),
  ],
};
