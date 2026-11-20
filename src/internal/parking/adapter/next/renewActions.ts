"use server";

import { revalidatePath } from "next/cache";
import { createRequestContainer } from "internal/container";
import { requireAuthenticatedUserId } from "internal/shared/auth/authContext";
import {
  createErrorState,
  createSuccessState,
} from "internal/shared/adapter/next/actionState";
import { createRequestDependencies } from "internal/shared/context/requestDependencies";
import { AppError } from "internal/shared/errors/appError";
import { sharedErrorMessages } from "internal/shared/errors/sharedErrorMessages";
import type { ActionState } from "types/actions";
import { parkingMessages } from "../../errors";
import { readRenewFormData } from "../../schema";

export type RenewActionState = ActionState & {
  result?: { paymentId: string; paidUntil: string };
};

export async function renewAction(
  _previousState: RenewActionState,
  formData: FormData,
): Promise<RenewActionState> {
  let dependencies: Awaited<ReturnType<typeof createRequestDependencies>>;
  try {
    dependencies = await createRequestDependencies();
  } catch (error) {
    console.error("[parking] renew action failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return createErrorState(sharedErrorMessages.authUnavailable);
  }
  try {
    await requireAuthenticatedUserId(dependencies.getAuth);
    const result = await createRequestContainer(dependencies).parking.renew(
      readRenewFormData(formData),
    );
    revalidatePath("/");
    revalidatePath("/slots/[code]", "page");
    return { ...createSuccessState("续费成功"), result };
  } catch (error) {
    if (error instanceof AppError) return createErrorState(error.message);
    dependencies.logger.error("[parking] renew action failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return createErrorState(parkingMessages.unavailable);
  }
}

export async function undoRenewalAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let dependencies: Awaited<ReturnType<typeof createRequestDependencies>>;
  try {
    dependencies = await createRequestDependencies();
  } catch (error) {
    console.error("[parking] undo renewal failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return createErrorState(sharedErrorMessages.authUnavailable);
  }
  try {
    await requireAuthenticatedUserId(dependencies.getAuth);
    await createRequestContainer(dependencies).parking.undoRenewal(
      formData.get("paymentId"),
    );
    revalidatePath("/");
    revalidatePath("/slots/[code]", "page");
    return createSuccessState("已撤销续费");
  } catch (error) {
    if (error instanceof AppError) return createErrorState(error.message);
    dependencies.logger.error("[parking] undo renewal failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return createErrorState(parkingMessages.unavailable);
  }
}
