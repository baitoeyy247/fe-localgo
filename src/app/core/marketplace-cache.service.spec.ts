import { describe, expect, it } from 'vitest';
import { mergeBranchIntoProvider } from './marketplace-provider-branches.util';
import { ProviderBranch, ProviderDetail } from './models';

function branch(id: string, name: string): ProviderBranch {
  return {
    id,
    name,
    latitude: 16.18,
    longitude: 103.29,
    serviceRadiusMeters: 5000,
    isActive: true,
  };
}

function providerWith(...branches: ProviderBranch[]): ProviderDetail {
  return {
    id: 'prov-1',
    providerType: 'Individual',
    name: 'Test',
    status: 'Active',
    averageVerifiedRating: 0,
    averagePublicRating: 0,
    verifiedReviewCount: 0,
    publicReviewCount: 0,
    branches,
    services: [],
  };
}

describe('mergeBranchIntoProvider (M-4)', () => {
  it('replaces branch name without refetch', () => {
    const merged = mergeBranchIntoProvider(providerWith(branch('b1', 'ชื่อเก่า')), branch('b1', 'ชื่อใหม่'));
    expect(merged.branches[0].name).toBe('ชื่อใหม่');
  });

  it('appends new branch', () => {
    const merged = mergeBranchIntoProvider(providerWith(branch('b1', 'A')), branch('b2', 'B'));
    expect(merged.branches.map((b) => b.name)).toEqual(['A', 'B']);
  });
});
