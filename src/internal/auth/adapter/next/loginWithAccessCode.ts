"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createRequestContainer } from "internal/container";
import { createErrorState } from "internal/shared/adapter/next/actionState";
import { createRequestDependencies } from "internal/shared/context/requestDependencies";
import { AppError } from "internal/shared/errors/appError";
import { sharedErrorMessages } from "internal/shared/errors/sharedErrorMessages";
import type { ActionState } from "types/actions";

import { parseAccessCode } from "../../schema";
import { getClientIp, hashClientIp } from "./clientIp";

export async function loginWithAccessCode(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let dependencies: Awaited<ReturnType<typeof createRequestDependencies>>;
  try {
    dependencies = await createRequestDependencies();
  } catch (error) {
    // 请求依赖尚未建立，只能使用 console 记录安全的错误类型。
    console.error("[auth] login action failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return createErrorState(sharedErrorMessages.authUnavailable);
  }

  try {
    const code = parseAccessCode(formData.get("accessCode"));
    const requestHeaders = await headers();
    const ipKey = hashClientIp(getClientIp(requestHeaders));
    await createRequestContainer(dependencies).auth.loginWithCode(code, ipKey);
  } catch (error) {
    if (error instanceof AppError) {
      return createErrorState(error.message);
    }
    // 未知异常只记录安全的错误类型，不返回原始 message。
    dependencies.logger.error("[auth] login action failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return createErrorState(sharedErrorMessages.authUnavailable);
  }

  redirect("/");
}
