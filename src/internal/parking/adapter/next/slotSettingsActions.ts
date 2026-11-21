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
import { readSlotSettingsFormData } from "../../schema";

export async function updateSlotSettingsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let dependencies: Awaited<ReturnType<typeof createRequestDependencies>>;
  try {
    dependencies = await createRequestDependencies();
  } catch (error) {
    console.error("[parking] slot settings dependencies failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return createErrorState(sharedErrorMessages.authUnavailable);
  }
  try {
    await requireAuthenticatedUserId(dependencies.getAuth);
    await createRequestContainer(dependencies).parking.updateSlotSettings(
      readSlotSettingsFormData(formData),
    );
    revalidatePath("/");
    revalidatePath("/settings/slots");
    revalidatePath("/slots/[code]", "page");
    return createSuccessState("车位设置已更新");
  } catch (error) {
    if (error instanceof AppError) return createErrorState(error.message);
    dependencies.logger.error("[parking] slot settings action failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return createErrorState(parkingMessages.unavailable);
  }
}
