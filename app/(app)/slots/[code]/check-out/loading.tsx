import { checkOutText } from "config/renewAndCheckOutText";
import { PageSkeleton } from "templates/layout/PageSkeleton/PageSkeleton";

export default function Loading() {
  return <PageSkeleton title={checkOutText.title} rows={5} />;
}
