import "server-only";

import { createRequestContainer } from "internal/container";
import { createServerRequestDependencies } from "internal/shared/context/createServerRequestDependencies";

export async function loadCheckInForm(code: string, now: Date) {
  const dependencies = await createServerRequestDependencies();
  return createRequestContainer(dependencies).parking.getCheckInForm(code, now);
}
