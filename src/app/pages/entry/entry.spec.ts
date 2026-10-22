import { describe, expect, it } from 'vitest';
import { ENTRY_SESSION_TIMEOUT_MS } from './entry.constants';

describe('EntryPage session timeout', () => {
  it('uses a 12s bootstrap timeout (retry UI at 10s via SlowLoadHint)', () => {
    expect(ENTRY_SESSION_TIMEOUT_MS).toBe(12_000);
  });
});
