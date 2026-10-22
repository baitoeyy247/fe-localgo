import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { DirtyFormGuardState } from './forms/dirty-form.guard';

/** Navigate only after global dirty guard approves (header back, bottom nav). */
export async function navigateWithDirtyGuard(
  router: Router,
  dirty: DirtyFormGuardState,
  url: string | unknown[],
  queryParams?: Record<string, string>,
): Promise<void> {
  if (!(await dirty.confirmDiscard())) {
    return;
  }
  if (Array.isArray(url)) {
    await router.navigate(url, queryParams ? { queryParams } : undefined);
    return;
  }
  await router.navigateByUrl(url);
}

export function injectNavGuardDeps(): { router: Router; dirty: DirtyFormGuardState } {
  return { router: inject(Router), dirty: inject(DirtyFormGuardState) };
}
