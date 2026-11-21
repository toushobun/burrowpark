import { healthRouter } from "internal/health/router";
import { maintenanceRouter } from "internal/maintenance/router";
import type { InternalModule } from "internal/internalModule";

/** 集中登记业务模块和 basePath，Master Router 只负责挂载。 */
export const internalModules = [
  { basePath: "/health", name: "health", router: healthRouter },
  { basePath: "/cron", name: "maintenance", router: maintenanceRouter },
] satisfies InternalModule[];
