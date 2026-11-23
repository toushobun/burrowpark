import { checkInText } from "config/checkInText";
import { SlotActionSkeleton } from "organisms/slots/SlotActionSkeleton/SlotActionSkeleton";

export default function Loading() {
  return <SlotActionSkeleton title={checkInText.title} rows={7} />;
}
