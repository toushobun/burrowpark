import { checkOutText } from "config/renewAndCheckOutText";
import { SlotActionSkeleton } from "organisms/slots/SlotActionSkeleton/SlotActionSkeleton";

export default function Loading() {
  return <SlotActionSkeleton title={checkOutText.title} rows={5} />;
}
