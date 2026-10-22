import { describe, expect, it } from 'vitest';
import { JOB_COMPLETED_REVIEW_NOTICE } from './request-detail.copy';

describe('ProviderRequestDetailPage job completion copy', () => {
  it('uses review handoff notice after completion', () => {
    expect(JOB_COMPLETED_REVIEW_NOTICE).toContain('รีวิว');
  });
});
