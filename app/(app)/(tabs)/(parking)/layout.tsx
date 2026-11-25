import type { ReactNode } from "react";

export default function ParkingLayout({
  children,
  operation,
}: {
  children: ReactNode;
  operation: ReactNode;
}) {
  return (
    <>
      {children}
      {operation}
    </>
  );
}
