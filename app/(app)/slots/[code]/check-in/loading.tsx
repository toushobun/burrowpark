import { checkInText } from "config/checkInText";
import { SlotActionSkeleton } from "organisms/slots/SlotActionSkeleton/SlotActionSkeleton";

export default function Loading() {
  return <SlotActionSkeleton title={checkInText.title} rowColumns={[1, 1, 1, 3, 4, 1, 3, 1, 1]} />;
}
