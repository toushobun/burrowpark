import { recordsText } from "config/recordsText";
import { PageSkeleton } from "templates/layout/PageSkeleton/PageSkeleton";

export default function Loading() {
  return (
    <PageSkeleton
      title={recordsText.title}
      rows={6}
      backHref="/settings"
    />
  );
}
