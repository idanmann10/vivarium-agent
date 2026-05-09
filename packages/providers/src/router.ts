import type { Capability, CostClass } from "../../core/src/index.js";
import type { LocalProvider } from "./local.js";

export interface ProviderRouteRequest {
  readonly costClass: CostClass;
  readonly capabilities: readonly Capability[];
}

const costOrder: Record<CostClass, number> = {
  cheap: 0,
  medium: 1,
  expensive: 2,
};

export function routeProvider(
  providers: readonly LocalProvider[],
  request: ProviderRouteRequest,
): LocalProvider | undefined {
  return providers
    .filter((provider) => costOrder[provider.costClass] <= costOrder[request.costClass])
    .filter((provider) => request.capabilities.every((capability) => provider.capabilities.includes(capability)))
    .sort((left, right) => costOrder[left.costClass] - costOrder[right.costClass])[0];
}
