import { renewText } from "config/renewAndCheckOutText";
import { SlotActionSkeleton } from "organisms/slots/SlotActionSkeleton/SlotActionSkeleton";

export default function Loading() {
  return <SlotActionSkeleton title={renewText.title} rows={6} />;
}
