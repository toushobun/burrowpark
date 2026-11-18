import { healthRouter } from "internal/health/router";
import type { InternalModule } from "internal/internalModule";

/** 集中登记业务模块和 basePath，Master Router 只负责挂载。 */
export const internalModules = [
  { basePath: "/health", name: "health", router: healthRouter },
] satisfies InternalModule[];
