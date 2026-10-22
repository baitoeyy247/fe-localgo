import { ProviderBranch, ProviderDetail } from './models';

export function mergeBranchIntoProvider(
  provider: ProviderDetail,
  branch: ProviderBranch,
): ProviderDetail {
  const has = provider.branches.some((b) => b.id === branch.id);
  const branches = has
    ? provider.branches.map((b) => (b.id === branch.id ? branch : b))
    : [...provider.branches, branch];
  return { ...provider, branches };
}

export function removeBranchFromProvider(
  provider: ProviderDetail,
  branchId: string,
): ProviderDetail {
  return { ...provider, branches: provider.branches.filter((b) => b.id !== branchId) };
}
