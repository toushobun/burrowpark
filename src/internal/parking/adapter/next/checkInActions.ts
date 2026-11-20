"use server";

import { revalidatePath } from "next/cache";

import { createRequestContainer } from "internal/container";
import {
  requireAuthenticatedUserId,
} from "internal/shared/auth/authContext";
import {
  createErrorState,
  createSuccessState,
} from "internal/shared/adapter/next/actionState";
import { createRequestDependencies } from "internal/shared/context/requestDependencies";
import { AppError } from "internal/shared/errors/appError";
import { sharedErrorMessages } from "internal/shared/errors/sharedErrorMessages";
import type { ActionState } from "types/actions";

import { parkingMessages } from "../../errors";
import { readCheckInFormData } from "../../schema";

export type CheckInActionState = ActionState & {
  result?: { sessionId: string; plate: string };
};

export async function checkInAction(
  _previousState: CheckInActionState,
  formData: FormData,
): Promise<CheckInActionState> {
  let dependencies: Awaited<ReturnType<typeof createRequestDependencies>>;
  try {
    dependencies = await createRequestDependencies();
  } catch (error) {
    console.error("[parking] check-in action failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return createErrorState(sharedErrorMessages.authUnavailable);
  }
  try {
    await requireAuthenticatedUserId(dependencies.getAuth);
    const result = await createRequestContainer(dependencies).parking.checkIn(
      readCheckInFormData(formData), new Date(),
    );
    revalidatePath("/");
    revalidatePath("/slots/[code]", "page");
    return { ...createSuccessState("登记成功"), result };
  } catch (error) {
    if (error instanceof AppError) return createErrorState(error.message);
    dependencies.logger.error("[parking] check-in action failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return createErrorState(parkingMessages.unavailable);
  }
}

export async function undoCheckInAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let dependencies: Awaited<ReturnType<typeof createRequestDependencies>>;
  try {
    dependencies = await createRequestDependencies();
  } catch (error) {
    console.error("[parking] undo action failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return createErrorState(sharedErrorMessages.authUnavailable);
  }
  try {
    await requireAuthenticatedUserId(dependencies.getAuth);
    await createRequestContainer(dependencies).parking.undoCheckIn(
      formData.get("sessionId"),
    );
    revalidatePath("/");
    revalidatePath("/slots/[code]", "page");
    return createSuccessState("已撤销登记");
  } catch (error) {
    if (error instanceof AppError) return createErrorState(error.message);
    dependencies.logger.error("[parking] undo action failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return createErrorState(parkingMessages.unavailable);
  }
}
