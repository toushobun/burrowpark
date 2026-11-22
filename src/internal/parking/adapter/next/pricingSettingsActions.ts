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
import { parkingMessages } from "../../errors";
import { readPricingSettingsFormData } from "../../schema";
import type { ActionState } from "types/actions";

export async function updatePricingSettingsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let dependencies: Awaited<ReturnType<typeof createRequestDependencies>>;
  try {
    dependencies = await createRequestDependencies();
  } catch (error) {
    console.error("[parking] pricing settings dependencies failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return createErrorState(sharedErrorMessages.authUnavailable);
  }
  try {
    await requireAuthenticatedUserId(dependencies.getAuth);
    await createRequestContainer(dependencies).parking.updatePricingSettings(
      readPricingSettingsFormData(formData),
    );
    revalidatePath("/");
    revalidatePath("/settings/pricing");
    revalidatePath("/slots/[code]/check-in", "page");
    revalidatePath("/slots/[code]/renew", "page");
    revalidatePath("/slots/[code]/check-out", "page");
    return createSuccessState("已保存");
  } catch (error) {
    if (error instanceof AppError) return createErrorState(error.message);
    dependencies.logger.error("[parking] pricing settings action failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return createErrorState(parkingMessages.unavailable);
  }
}
