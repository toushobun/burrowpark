import "server-only";

import { createRequestContainer } from "internal/container";
import { createServerRequestDependencies } from "internal/shared/context/createServerRequestDependencies";
import { parseMonthlyStatsMonth } from "../../schema";
import { getBusinessMonth } from "../../util/parkingDomain";

/** 月统计仅接受经 Zod 检查的业务月份，未提供或非法时显示本月。 */
export async function loadMonthlyStats(input: unknown, now = new Date()) {
  const month = parseMonthlyStatsMonth(input, now);
  const dependencies = await createServerRequestDependencies();
  const stats =
    await createRequestContainer(dependencies).parking.getMonthlyStats(month);
  return { month, currentMonth: getBusinessMonth(now), stats };
}
