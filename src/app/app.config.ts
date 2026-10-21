import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { authErrorInterceptor } from './core/auth-error.interceptor';
import { ngrokInterceptor } from './core/ngrok.interceptor';
import { timeoutInterceptor } from './core/timeout.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(
      withInterceptors([timeoutInterceptor, ngrokInterceptor, authInterceptor, authErrorInterceptor]),
    ),
    provideRouter(routes),
  ],
};
