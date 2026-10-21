import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { LocalGoApiService } from '../core/localgo-api.service';

/** When a provider opens a requester deep link for their own job, send them to provider UI. */
export async function redirectProviderFromRequesterRoute(
  api: LocalGoApiService,
  auth: AuthService,
  router: Router,
  requestId: string,
): Promise<boolean> {
  if (auth.activeRole() !== 'Provider') {
    return false;
  }

  try {
    const [myProvider, detail] = await Promise.all([
      firstValueFrom(api.getMyProvider()),
      firstValueFrom(api.getRequest(requestId)),
    ]);

    if (detail.selectedProviderId !== myProvider.id) {
      return false;
    }

    const isProviderContext =
      auth.activeRole() === 'Provider' || !!myProvider?.id;
    if (!isProviderContext) {
      return false;
    }

    await router.navigateByUrl(`/provider/requests/${requestId}`, { replaceUrl: true });
    return true;
  } catch (e) {
    if (e instanceof HttpErrorResponse && e.status === 404) {
      return false;
    }
    return false;
  }
}
