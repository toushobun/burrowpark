import { commonText } from "config/commonText";
import { PageSkeleton } from "templates/layout/PageSkeleton/PageSkeleton";

export default function Loading() {
  return <PageSkeleton title={commonText.loading} rows={5} backHref="/" />;
}
