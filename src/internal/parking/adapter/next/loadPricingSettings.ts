import "server-only";

import { createRequestContainer } from "internal/container";
import { createServerRequestDependencies } from "internal/shared/context/createServerRequestDependencies";

export async function loadPricingSettings() {
  const dependencies = await createServerRequestDependencies();
  return createRequestContainer(dependencies).parking.getPricingSettings();
}
