/** JSON snapshot helper for unsaved-change detection. */
export class FormSnapshotTracker {
  private baseline = '';

  capture(state: unknown): void {
    this.baseline = JSON.stringify(state);
  }

  changed(state: unknown): boolean {
    return this.baseline !== JSON.stringify(state);
  }
}

export function formState<T extends object>(factory: () => T): T {
  return factory();
}
