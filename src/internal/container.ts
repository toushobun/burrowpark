import { createAuthRepository } from "internal/auth/repository/authRepository";
import { createAuthService } from "internal/auth/service/authService";
import type { AuthService } from "internal/auth";
import type { ParkingService } from "internal/parking";
import { createParkingRepository } from "internal/parking/repository/parkingRepository";
import { createParkingService } from "internal/parking/service/parkingService";
import type { RequestDependencies } from "internal/shared/context/requestDependencies";

/**
 * 请求级依赖容器。Hono middleware 和 Server Component 都可以调用
 * createRequestContainer(dependencies) 得到同一形状的 Container，
 * 再直接调用目标模块的 Service——不经过内部 HTTP、不发起自请求。
 *
 * Container 只负责创建 Repository / Service 并完成依赖注入，
 * 不负责 URL、HTTP 状态码、数据库查询本身、业务逻辑、权限规则或缓存失效。
 *
 * 新增业务模块时，按「模块字段 + getter 惰性构造」的方式登记：
 * 未被访问的模块不会创建对应的 Repository / Service。
 */
export type RequestContainer = Readonly<{
  auth: AuthService;
  parking: ParkingService;
}>;

export function createRequestContainer(
  dependencies: RequestDependencies,
): RequestContainer {
  let auth: AuthService | undefined;
  let parking: ParkingService | undefined;
  return {
    get auth() {
      auth ??= createAuthService(
        createAuthRepository(dependencies.supabase, dependencies.logger),
      );
      return auth;
    },
    get parking() {
      parking ??= createParkingService(
        createParkingRepository(dependencies.supabase, dependencies.logger),
        dependencies.getAuth,
      );
      return parking;
    },
  };
}
