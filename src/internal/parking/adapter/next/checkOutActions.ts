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
import { readCheckOutFormData } from "../../schema";

export type CheckOutActionState = ActionState & {
  result?: { sessionId: string; plate: string };
};

export async function checkOutAction(
  _previousState: CheckOutActionState,
  formData: FormData,
): Promise<CheckOutActionState> {
  let dependencies: Awaited<ReturnType<typeof createRequestDependencies>>;
  try {
    dependencies = await createRequestDependencies();
  } catch (error) {
    console.error("[parking] check-out action failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return createErrorState(sharedErrorMessages.authUnavailable);
  }
  try {
    await requireAuthenticatedUserId(dependencies.getAuth);
    const result = await createRequestContainer(dependencies).parking.checkOut(
      readCheckOutFormData(formData),
    );
    revalidatePath("/");
    revalidatePath("/slots/[code]", "page");
    return { ...createSuccessState("离场成功"), result };
  } catch (error) {
    if (error instanceof AppError) return createErrorState(error.message);
    dependencies.logger.error("[parking] check-out action failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return createErrorState(parkingMessages.unavailable);
  }
}

export async function undoCheckOutAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let dependencies: Awaited<ReturnType<typeof createRequestDependencies>>;
  try {
    dependencies = await createRequestDependencies();
  } catch (error) {
    console.error("[parking] undo check-out failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return createErrorState(sharedErrorMessages.authUnavailable);
  }
  try {
    await requireAuthenticatedUserId(dependencies.getAuth);
    await createRequestContainer(dependencies).parking.undoCheckOut(
      formData.get("sessionId"),
    );
    revalidatePath("/");
    revalidatePath("/slots/[code]", "page");
    return createSuccessState("已撤销离场");
  } catch (error) {
    if (error instanceof AppError) return createErrorState(error.message);
    dependencies.logger.error("[parking] undo check-out failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return createErrorState(parkingMessages.unavailable);
  }
}
