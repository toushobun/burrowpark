import { recordsText } from "config/recordsText";
import { PageSkeleton } from "templates/layout/PageSkeleton/PageSkeleton";

export default function Loading() {
  return (
    <PageSkeleton
      title={recordsText.title}
      rowColumns={[3, 3, 1, 1]}
      backHref="/settings"
    />
  );
}
