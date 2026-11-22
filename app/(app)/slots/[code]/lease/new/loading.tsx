import { leaseText } from "config/leaseText";
import { PageSkeleton } from "templates/layout/PageSkeleton/PageSkeleton";

export default function Loading() {
  return <PageSkeleton title={leaseText.createTitle} rows={7} />;
}
