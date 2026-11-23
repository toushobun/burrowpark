import { operationText } from "config/operationText";
import type { SlotDetail } from "internal/parking";
import { formatPlateForDisplay } from "internal/parking";

import type { OperationParams } from "./operationParams";

export type OperationNotice = {
  kind:
    | OperationParams["done"]
    | "checkout"
    | "renew"
    | "cancel"
    | "extend"
    | "end"
    | "edit";
  code: string;
  id: string;
  message: string;
  photoSaved?: boolean;
  extraUndoFields?: { name: string; value: string }[];
};

/** URL 的 id 只作定位，服务端实际记录不吻合时不展示完成提示。 */
export function resolveOperationNotice(
  params: OperationParams | null,
  detail: SlotDetail | null,
): OperationNotice | null {
  if (!params || !detail || detail.code !== params.slot) return null;

  if (params.done === "checkin") {
    const vehicle = detail.presentVehicle;
    if (!vehicle || vehicle.sessionId !== params.id) return null;
    return {
      kind: "checkin",
      code: params.slot,
      id: params.id,
      message: operationText.checkedIn(
        detail.name,
        formatPlateForDisplay(vehicle.plate),
      ),
      photoSaved: params.photo !== "0",
    };
  }

  if (params.done === "reserve") {
    if (detail.reservation?.id !== params.id) return null;
    return {
      kind: "reserve",
      code: params.slot,
      id: params.id,
      message: operationText.reserved(
        detail.name,
        detail.reservation.guestName ?? null,
      ),
    };
  }

  if (detail.lease?.id !== params.id) return null;
  return {
    kind: "lease",
    code: params.slot,
    id: params.id,
    message: operationText.leased(detail.name, detail.lease.tenantName),
  };
}
