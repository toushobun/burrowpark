import type { Tables } from "internal/shared/supabase/database.types";

export type RecordPayment = Pick<
  Tables<"payments">,
  "id" | "amount_cents" | "method" | "purpose" | "paid_at" | "paid_until"
>;

export type RecordSession = Pick<
  Tables<"parking_sessions">,
  "id" | "slot_code" | "plate" | "billing_type" | "entered_at" | "left_at"
> & { session_payments: RecordPayment[] };

export type RecordLeasePayment = RecordPayment & {
  leases: { slot_code: string; tenant_name: string; plate: string | null };
};
