import { slotDetailText } from "config/slotDetailText";
import {
  formatBusinessDate,
  formatBusinessDateTime,
  formatElapsed,
} from "internal/parking";
import { loadSlotDetail } from "internal/parking/adapter/next/loadSlotDetail";
import { SlotDetail } from "organisms/slots/SlotDetail/SlotDetail";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default async function SlotDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const now = new Date();
  const loadedDetail = await loadSlotDetail(code, now);
  // 停用车位不需要向客户端传递车辆或租户的个人信息。
  const detail =
    loadedDetail && !loadedDetail.isActive
      ? {
          ...loadedDetail,
          presentVehicle: null,
          reservation: null,
          lease: null,
        }
      : loadedDetail;
  const vehicle = detail?.presentVehicle;

  const display = detail
    ? {
        enteredAt: vehicle ? formatBusinessDateTime(vehicle.enteredAt) : null,
        paidUntil: vehicle?.paidUntil
          ? vehicle.billingType === "lease"
            ? formatBusinessDate(vehicle.paidUntil)
            : formatBusinessDateTime(vehicle.paidUntil)
          : null,
        elapsed: vehicle ? formatElapsed(vehicle.enteredAt, now) : null,
        borrowUntil: vehicle?.borrowUntil
          ? formatBusinessDateTime(vehicle.borrowUntil).split(" ")[1]
          : null,
        leasePaidUntil: detail.lease?.paidUntil
          ? formatBusinessDate(detail.lease.paidUntil)
          : null,
      }
    : null;

  return (
    <PageShell title={slotDetailText.pageTitle}>
      <SlotDetail detail={detail} display={display} />
    </PageShell>
  );
}
