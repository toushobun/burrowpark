import "server-only";

import { createRequestContainer } from "internal/container";
import { createServerRequestDependencies } from "internal/shared/context/createServerRequestDependencies";

/** 首页服务端读数入口；由页面传入本次渲染时刻。 */
export async function loadSlotMap(now: Date) {
  const dependencies = await createServerRequestDependencies();
  return createRequestContainer(dependencies).parking.getSlotMap(now);
}

/** 首页一次准备全部车位的操作数据，点击时无需请求详情。 */
export async function loadSlotOperationViews(now: Date) {
  const dependencies = await createServerRequestDependencies();
  const { parking } = createRequestContainer(dependencies);
  return parking.getSlotOperationViews(now);
}
