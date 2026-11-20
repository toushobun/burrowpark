"use server";

import { revalidatePath } from "next/cache";
import { createRequestContainer } from "internal/container";
import type { ParkingService } from "internal/parking";
import { requireAuthenticatedUserId } from "internal/shared/auth/authContext";
import { createErrorState, createSuccessState } from "internal/shared/adapter/next/actionState";
import { createRequestDependencies } from "internal/shared/context/requestDependencies";
import { AppError } from "internal/shared/errors/appError";
import { sharedErrorMessages } from "internal/shared/errors/sharedErrorMessages";
import type { ActionState } from "types/actions";
import { parkingMessages } from "../../errors";
import { readParkingOperationFormData } from "../../schema";

export type SlotActionState = ActionState & {
  result?: { id: string; previous?: string; current?: string };
};

async function execute(
  formData: FormData,
  successText: string,
  operation: (service: ParkingService, data: FormData) =>
    Promise<SlotActionState["result"] | undefined>,
): Promise<SlotActionState> {
  let dependencies: Awaited<ReturnType<typeof createRequestDependencies>>;
  try {
    dependencies = await createRequestDependencies();
  } catch (error) {
    console.error("[parking] slot operation unavailable", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return createErrorState(sharedErrorMessages.authUnavailable);
  }
  try {
    await requireAuthenticatedUserId(dependencies.getAuth);
    const result = await operation(createRequestContainer(dependencies).parking, formData);
    revalidatePath("/");
    revalidatePath("/slots/[code]", "page");
    revalidatePath("/settings/slots");
    return { ...createSuccessState(successText), ...(result ? { result } : {}) };
  } catch (error) {
    if (error instanceof AppError) return createErrorState(error.message);
    dependencies.logger.error("[parking] slot operation failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return createErrorState(parkingMessages.unavailable);
  }
}

export async function createLeaseAction(_state: SlotActionState, data: FormData): Promise<SlotActionState> {
  return execute(data, "长租建立成功", async (service, form) => {
    const result = await service.createLease(readParkingOperationFormData(form));
    return { id: result.leaseId };
  });
}
export async function undoCreateLeaseAction(_state: SlotActionState, data: FormData): Promise<SlotActionState> {
  return execute(data, "已撤销长租", async (service, form) => {
    await service.undoCreateLease(form.get("leaseId"));
    return undefined;
  });
}
export async function editLeaseAction(_state: SlotActionState, data: FormData): Promise<SlotActionState> {
  return execute(data, "长租资料已保存", async (service, form) => {
    await service.editLease(readParkingOperationFormData(form));
    return undefined;
  });
}
export async function endLeaseAction(_state: SlotActionState, data: FormData): Promise<SlotActionState> {
  return execute(data, "退租成功", async (service, form) => {
    const result = await service.endLease(readParkingOperationFormData(form));
    return { id: result.leaseId };
  });
}
export async function undoEndLeaseAction(_state: SlotActionState, data: FormData): Promise<SlotActionState> {
  return execute(data, "已撤销退租", async (service, form) => {
    await service.undoEndLease(form.get("leaseId"));
    return undefined;
  });
}
export async function reserveAction(_state: SlotActionState, data: FormData): Promise<SlotActionState> {
  return execute(data, "预留成功", async (service, form) => {
    const result = await service.reserve(readParkingOperationFormData(form));
    return { id: result.reservationId };
  });
}
export async function undoReservationAction(_state: SlotActionState, data: FormData): Promise<SlotActionState> {
  return execute(data, "已撤销预留", async (service, form) => {
    await service.undoReservation(form.get("reservationId"));
    return undefined;
  });
}
export async function cancelReservationAction(_state: SlotActionState, data: FormData): Promise<SlotActionState> {
  return execute(data, "已取消预留", async (service, form) => {
    const result = await service.cancelReservation(form.get("reservationId"));
    return { id: result.reservationId };
  });
}
export async function undoCancelReservationAction(_state: SlotActionState, data: FormData): Promise<SlotActionState> {
  return execute(data, "已撤销取消预留", async (service, form) => {
    await service.undoCancelReservation(form.get("reservationId"));
    return undefined;
  });
}
export async function extendBorrowAction(_state: SlotActionState, data: FormData): Promise<SlotActionState> {
  return execute(data, "已延长借用", async (service, form) => {
    const result = await service.extendBorrow(readParkingOperationFormData(form));
    return { id: result.sessionId, previous: result.previous, current: result.current };
  });
}
export async function undoExtendBorrowAction(_state: SlotActionState, data: FormData): Promise<SlotActionState> {
  return execute(data, "已撤销延长借用", async (service, form) => {
    await service.undoExtendBorrow(readParkingOperationFormData(form));
    return undefined;
  });
}
