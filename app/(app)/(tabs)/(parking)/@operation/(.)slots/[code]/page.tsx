import { SlotDetailContent } from "organisms/slots/SlotDetail/SlotDetailContent";

export default async function OperationPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <SlotDetailContent code={code} modal />;
}
