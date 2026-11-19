import "server-only";

import { createRequestContainer } from "internal/container";
import { createServerRequestDependencies } from "internal/shared/context/createServerRequestDependencies";

/** 详情页服务端读数入口；车位是否存在由数据库事实判断。 */
export async function loadSlotDetail(code: string, now: Date) {
  const dependencies = await createServerRequestDependencies();
  return createRequestContainer(dependencies).parking.getSlotDetail(code, now);
}
