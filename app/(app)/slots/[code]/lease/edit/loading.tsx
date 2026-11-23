import { leaseText } from "config/leaseText";
import { SlotActionSkeleton } from "organisms/slots/SlotActionSkeleton/SlotActionSkeleton";

export default function Loading() {
  return <SlotActionSkeleton title={leaseText.editTitle} rows={7} />;
}
