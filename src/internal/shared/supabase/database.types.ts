// 与 supabase gen types typescript --local --schema public 的 public schema 对应。
// 环境准备完成后应通过 npm run db:types 重新生成并检查差异。
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      family_account: {
        Row: { user_id: string };
        Insert: { user_id: string };
        Update: { user_id?: string };
        Relationships: [];
      };
      login_attempts: {
        Row: {
          attempt_count: number;
          key: string;
          locked_until: string | null;
          window_started_at: string;
        };
        Insert: {
          attempt_count: number;
          key: string;
          locked_until?: string | null;
          window_started_at: string;
        };
        Update: {
          attempt_count?: number;
          key?: string;
          locked_until?: string | null;
          window_started_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      consume_login_attempt: {
        Args: { p_ip_key: string };
        Returns: { allowed: boolean; retry_after_seconds: number }[];
      };
      is_family_account: { Args: Record<PropertyKey, never>; Returns: boolean };
      reset_login_attempts: { Args: { p_ip_key: string }; Returns: undefined };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
