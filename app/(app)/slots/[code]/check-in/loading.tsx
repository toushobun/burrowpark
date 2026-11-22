import { checkInText } from "config/checkInText";
import { PageSkeleton } from "templates/layout/PageSkeleton/PageSkeleton";

export default function Loading() {
  return <PageSkeleton title={checkInText.title} rows={7} />;
}
