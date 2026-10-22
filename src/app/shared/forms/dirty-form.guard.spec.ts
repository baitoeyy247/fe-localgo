import { describe, expect, it, vi } from 'vitest';
import { DirtyFormGuardState, summarizeChanges } from './dirty-form.guard';
import { FormSnapshotTracker } from './form-snapshot';

describe('dirty form guard (N-3)', () => {
  it('summarizeChanges joins diff lines', () => {
    expect(summarizeChanges(['ชื่อ: A → B', ''])).toBe('ชื่อ: A → B');
    expect(summarizeChanges([])).toBe('ไม่มีการเปลี่ยนแปลง');
  });

  it('FormSnapshotTracker detects edits', () => {
    const t = new FormSnapshotTracker();
    t.capture({ a: 1 });
    expect(t.changed({ a: 1 })).toBe(false);
    expect(t.changed({ a: 2 })).toBe(true);
  });

  it('DirtyFormGuardState prompts when dirty', async () => {
    const state = new DirtyFormGuardState();
    expect(await state.confirmDiscard()).toBe(true);
    state.markDirty();
    const pending = state.confirmDiscard();
    expect(state.discardPromptOpen()).toBe(true);
    state.resolveDiscard(false);
    expect(await pending).toBe(false);
    expect(state.isDirty()).toBe(true);
    const pending2 = state.confirmDiscard();
    state.resolveDiscard(true);
    expect(await pending2).toBe(true);
    expect(state.isDirty()).toBe(false);
  });

  it('binds beforeunload when dirty', () => {
    const state = new DirtyFormGuardState();
    const add = vi.spyOn(window, 'addEventListener');
    state.markDirty();
    state.bindBeforeUnload();
    expect(add).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    state.unbindBeforeUnload();
  });
});
