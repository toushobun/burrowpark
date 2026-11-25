import { Suspense } from "react";

import { SlotDetailContent } from "organisms/slots/SlotDetail/SlotDetailContent";

type Props = {
  params: Promise<{ code: string }>;
};

async function OperationContent({ params }: Props) {
  const { code } = await params;
  return <SlotDetailContent code={code} modal />;
}

export default function OperationPage({ params }: Props) {
  // 数据未就绪时只保留已经显示的背景地图，不挂载空弹窗或骨架屏。
  return (
    <Suspense fallback={null}>
      <OperationContent params={params} />
    </Suspense>
  );
}
