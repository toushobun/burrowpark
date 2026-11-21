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

export async function recordsCorrectionAction(
  _previous: ActionState,
  data: FormData,
): Promise<ActionState> {
  let dependencies: Awaited<ReturnType<typeof createRequestDependencies>>;
  try {
    dependencies = await createRequestDependencies();
  } catch (error) {
    console.error("[parking] record correction dependencies failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return createErrorState(sharedErrorMessages.authUnavailable);
  }
  try {
    await requireAuthenticatedUserId(dependencies.getAuth);
    const service = createRequestContainer(dependencies).parking;
    const operation = data.get("operation");
    if (operation === "plate") {
      await service.correctSessionPlate({
        sessionId: data.get("sessionId"),
        plate: data.get("plate"),
      });
    } else if (operation === "payment") {
      await service.correctPayment({
        paymentId: data.get("paymentId"),
        amountYuan: data.get("amountYuan"),
        method: data.get("method"),
      });
    } else if (operation === "delete") {
      await service.deletePayment({ paymentId: data.get("paymentId") });
    } else {
      await service.correctPayment({});
    }
    revalidatePath("/records");
    revalidatePath("/");
    revalidatePath("/stats");
    revalidatePath("/slots/[code]", "page");
    return createSuccessState("更正已保存");
  } catch (error) {
    if (error instanceof AppError) return createErrorState(error.message);
    dependencies.logger.error("[parking] record correction failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return createErrorState(parkingMessages.unavailable);
  }
}
