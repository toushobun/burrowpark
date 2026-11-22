import { renewText } from "config/renewAndCheckOutText";
import { PageSkeleton } from "templates/layout/PageSkeleton/PageSkeleton";

export default function Loading() {
  return <PageSkeleton title={renewText.title} rows={6} />;
}
