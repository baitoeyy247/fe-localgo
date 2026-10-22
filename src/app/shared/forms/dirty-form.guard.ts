import { inject, Injectable, signal } from '@angular/core';
import { CanDeactivateFn, Router } from '@angular/router';

/** Tracks unsaved form edits and prompts before navigation. */
@Injectable({ providedIn: 'root' })
export class DirtyFormGuardState {
  private readonly dirty = signal(false);
  private discardResolver: ((ok: boolean) => void) | null = null;
  readonly discardPromptOpen = signal(false);

  isDirty(): boolean {
    return this.dirty();
  }

  markDirty(): void {
    this.dirty.set(true);
  }

  markPristine(): void {
    this.dirty.set(false);
  }

  async confirmDiscard(): Promise<boolean> {
    if (!this.dirty()) {
      return true;
    }
    return new Promise<boolean>((resolve) => {
      this.discardResolver = resolve;
      this.discardPromptOpen.set(true);
    });
  }

  resolveDiscard(allow: boolean): void {
    this.discardPromptOpen.set(false);
    if (allow) {
      this.markPristine();
    }
    this.discardResolver?.(allow);
    this.discardResolver = null;
  }

  bindBeforeUnload(): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.addEventListener('beforeunload', this.onBeforeUnload);
  }

  unbindBeforeUnload(): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.removeEventListener('beforeunload', this.onBeforeUnload);
  }

  private readonly onBeforeUnload = (event: BeforeUnloadEvent): void => {
    if (!this.dirty()) {
      return;
    }
    event.preventDefault();
  };
}

export const dirtyFormCanDeactivate: CanDeactivateFn<unknown> = async () => {
  const state = inject(DirtyFormGuardState);
  return state.confirmDiscard();
};

export function summarizeChanges(lines: string[]): string {
  const items = lines.filter((l) => l.trim());
  return items.length ? items.join('\n') : 'ไม่มีการเปลี่ยนแปลง';
}
