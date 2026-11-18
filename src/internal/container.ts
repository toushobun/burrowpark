import { createAuthRepository } from "internal/auth/repository/authRepository";
import { createAuthService } from "internal/auth/service/authService";
import type { AuthService } from "internal/auth";
import type { RequestDependencies } from "internal/shared/context/requestDependencies";

/** 请求级容器按需创建 Service，认证 Client 不跨请求复用。 */
export type RequestContainer = Readonly<{ auth: AuthService }>;

export function createRequestContainer(
  dependencies: RequestDependencies,
): RequestContainer {
  let auth: AuthService | undefined;
  return {
    get auth() {
      auth ??= createAuthService(
        createAuthRepository(dependencies.supabase, dependencies.logger),
      );
      return auth;
    },
  };
}
