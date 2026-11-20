import "server-only";

import { createRequestContainer } from "internal/container";
import { createServerRequestDependencies } from "internal/shared/context/createServerRequestDependencies";

/** 首页提醒复用停车模块的事实查询与状态推导，不访问额外业务表。 */
export async function loadReminders(now: Date) {
  const dependencies = await createServerRequestDependencies();
  return createRequestContainer(dependencies).parking.getReminders(now);
}
