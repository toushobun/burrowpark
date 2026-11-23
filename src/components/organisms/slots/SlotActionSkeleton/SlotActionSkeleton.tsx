"use client";

import { useParams } from "next/navigation";

import { PageSkeleton } from "templates/layout/PageSkeleton/PageSkeleton";

type Props = { title: string; rows: number };

/** 加载页与实际操作页使用同一个车位详情返回目标。 */
export function SlotActionSkeleton({ title, rows }: Props) {
  const params = useParams<{ code: string }>();
  const code = params?.code;
  return (
    <PageSkeleton
      title={title}
      rows={rows}
      backHref={code ? "/slots/" + encodeURIComponent(code) : "/"}
    />
  );
}
