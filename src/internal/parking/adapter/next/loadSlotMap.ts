import "server-only";

import { createRequestContainer } from "internal/container";
import { createServerRequestDependencies } from "internal/shared/context/createServerRequestDependencies";

/** 首页服务端读数入口；由页面传入本次渲染时刻。 */
export async function loadSlotMap(now: Date) {
  const dependencies = await createServerRequestDependencies();
  return createRequestContainer(dependencies).parking.getSlotMap(now);
}
