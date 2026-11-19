import { slotMapText } from "config/slotMapText";
import { loadSlotMap } from "internal/parking/adapter/next/loadSlotMap";
import { ParkingSlotMap } from "organisms/slots/ParkingSlotMap/ParkingSlotMap";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default async function HomePage() {
  const slots = await loadSlotMap(new Date());

  return (
    <PageShell subtitle={slotMapText.subtitle} title={slotMapText.title}>
      <ParkingSlotMap slots={slots} />
    </PageShell>
  );
}
