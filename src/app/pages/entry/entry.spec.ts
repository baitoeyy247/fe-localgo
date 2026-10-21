import { describe, expect, it } from 'vitest';
import { EntryPage } from './entry';

describe('EntryPage session timeout', () => {
  it('uses a 12s bootstrap timeout (retry UI at 10s via SlowLoadHint)', () => {
    expect(EntryPage.SESSION_TIMEOUT_MS).toBe(12_000);
  });
});
