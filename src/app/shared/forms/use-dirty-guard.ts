import { DirtyFormGuardState, summarizeChanges } from './dirty-form.guard';
import { FormSnapshotTracker } from './form-snapshot';

/**
 * Per-page dirty tracking + global route/beforeunload guard (N-3 / N-4).
 * `private readonly formGuard = new UseDirtyGuard(inject(DirtyFormGuardState));`
 */
export class UseDirtyGuard {
  private readonly tracker = new FormSnapshotTracker();

  constructor(private readonly global: DirtyFormGuardState) {}

  captureBaseline(state: unknown): void {
    this.tracker.capture(state);
    this.global.markPristine();
    this.global.unbindBeforeUnload();
  }

  syncDirty(state: unknown): void {
    if (this.tracker.changed(state)) {
      this.global.markDirty();
      this.global.bindBeforeUnload();
    } else {
      this.global.markPristine();
      this.global.unbindBeforeUnload();
    }
  }

  hasChanges(state: unknown): boolean {
    return this.tracker.changed(state);
  }

  markSaved(state: unknown): void {
    this.tracker.capture(state);
    this.global.markPristine();
    this.global.unbindBeforeUnload();
  }

  buildSaveMessage(lines: string[]): string {
    return summarizeChanges(lines);
  }

  async confirmDiscardLocal(): Promise<boolean> {
    return this.global.confirmDiscard();
  }
}
