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
  try {
    const code = parseAccessCode(formData.get("accessCode"));
    const requestHeaders = await headers();
    const ipKey = hashClientIp(getClientIp(requestHeaders));
    const dependencies = await createRequestDependencies();
    await createRequestContainer(dependencies).auth.loginWithCode(code, ipKey);
  } catch (error) {
    if (error instanceof AppError) {
      return createErrorState(error.message);
    }
    // 未知异常只能记录安全的错误类型，不能返回原始 message。
    console.error("[auth] login action failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return createErrorState(sharedErrorMessages.authUnavailable);
  }

  redirect("/");
}
