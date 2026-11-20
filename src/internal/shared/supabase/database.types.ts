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
        Row: {
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          user_id: string;
        };
        Update: {
          user_id?: string;
        };
        Relationships: [];
      };
      leases: {
        Row: {
          created_at: string;
          ended_on: string | null;
          id: string;
          note: string | null;
          phone: string | null;
          plate: string | null;
          slot_code: string;
          starts_on: string;
          tenant_name: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          ended_on?: string | null;
          id?: string;
          note?: string | null;
          phone?: string | null;
          plate?: string | null;
          slot_code: string;
          starts_on: string;
          tenant_name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          ended_on?: string | null;
          id?: string;
          note?: string | null;
          phone?: string | null;
          plate?: string | null;
          slot_code?: string;
          starts_on?: string;
          tenant_name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leases_slot_code_fkey";
            columns: ["slot_code"];
            isOneToOne: false;
            referencedRelation: "slots";
            referencedColumns: ["code"];
          },
        ];
      };
      login_attempts: {
        Row: {
          attempt_count: number;
          key: string;
          locked_until: string | null;
          window_started_at: string;
        };
        ComputedFields: never;
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
      parking_sessions: {
        Row: {
          billing_type: Database["public"]["Enums"]["billing_type"];
          borrow_until: string | null;
          created_at: string;
          entered_at: string;
          id: string;
          lease_id: string | null;
          left_at: string | null;
          note: string | null;
          photo_path: string | null;
          plate: string;
          slot_code: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          billing_type: Database["public"]["Enums"]["billing_type"];
          borrow_until?: string | null;
          created_at?: string;
          entered_at?: string;
          id?: string;
          lease_id?: string | null;
          left_at?: string | null;
          note?: string | null;
          photo_path?: string | null;
          plate: string;
          slot_code: string;
          updated_at?: string;
        };
        Update: {
          billing_type?: Database["public"]["Enums"]["billing_type"];
          borrow_until?: string | null;
          created_at?: string;
          entered_at?: string;
          id?: string;
          lease_id?: string | null;
          left_at?: string | null;
          note?: string | null;
          photo_path?: string | null;
          plate?: string;
          slot_code?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "parking_sessions_lease_id_fkey";
            columns: ["lease_id"];
            isOneToOne: false;
            referencedRelation: "leases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parking_sessions_slot_code_fkey";
            columns: ["slot_code"];
            isOneToOne: false;
            referencedRelation: "slots";
            referencedColumns: ["code"];
          },
        ];
      };
      payments: {
        Row: {
          amount_cents: number;
          created_at: string;
          id: string;
          lease_id: string | null;
          method: Database["public"]["Enums"]["payment_method"];
          paid_at: string;
          paid_until: string | null;
          purpose: Database["public"]["Enums"]["payment_purpose"];
          session_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          created_at?: string;
          id?: string;
          lease_id?: string | null;
          method: Database["public"]["Enums"]["payment_method"];
          paid_at?: string;
          paid_until?: string | null;
          purpose: Database["public"]["Enums"]["payment_purpose"];
          session_id?: string | null;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          id?: string;
          lease_id?: string | null;
          method?: Database["public"]["Enums"]["payment_method"];
          paid_at?: string;
          paid_until?: string | null;
          purpose?: Database["public"]["Enums"]["payment_purpose"];
          session_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_lease_id_fkey";
            columns: ["lease_id"];
            isOneToOne: false;
            referencedRelation: "leases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "parking_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      pricing_settings: {
        Row: {
          hotel_checkout_hour: number;
          hotel_daily_price_cents: number;
          hotel_previous_day_before_hour: number;
          hourly_price_cents: number;
          id: boolean;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          hotel_checkout_hour: number;
          hotel_daily_price_cents: number;
          hotel_previous_day_before_hour: number;
          hourly_price_cents: number;
          id?: boolean;
          updated_at?: string;
        };
        Update: {
          hotel_checkout_hour?: number;
          hotel_daily_price_cents?: number;
          hotel_previous_day_before_hour?: number;
          hourly_price_cents?: number;
          id?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      reservations: {
        Row: {
          closed_at: string | null;
          created_at: string;
          guest_name: string | null;
          id: string;
          note: string | null;
          outcome: Database["public"]["Enums"]["reservation_outcome"] | null;
          session_id: string | null;
          slot_code: string;
        };
        ComputedFields: never;
        Insert: {
          closed_at?: string | null;
          created_at?: string;
          guest_name?: string | null;
          id?: string;
          note?: string | null;
          outcome?: Database["public"]["Enums"]["reservation_outcome"] | null;
          session_id?: string | null;
          slot_code: string;
        };
        Update: {
          closed_at?: string | null;
          created_at?: string;
          guest_name?: string | null;
          id?: string;
          note?: string | null;
          outcome?: Database["public"]["Enums"]["reservation_outcome"] | null;
          session_id?: string | null;
          slot_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "parking_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_slot_code_fkey";
            columns: ["slot_code"];
            isOneToOne: false;
            referencedRelation: "slots";
            referencedColumns: ["code"];
          },
        ];
      };
      slots: {
        Row: {
          code: string;
          is_active: boolean;
          kind: Database["public"]["Enums"]["slot_kind"];
          name: string;
          sort_order: number;
          yard: Database["public"]["Enums"]["yard"];
        };
        ComputedFields: never;
        Insert: {
          code: string;
          is_active?: boolean;
          kind: Database["public"]["Enums"]["slot_kind"];
          name: string;
          sort_order: number;
          yard: Database["public"]["Enums"]["yard"];
        };
        Update: {
          code?: string;
          is_active?: boolean;
          kind?: Database["public"]["Enums"]["slot_kind"];
          name?: string;
          sort_order?: number;
          yard?: Database["public"]["Enums"]["yard"];
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      cancel_reservation: {
        Args: { p_reservation_id: string };
        Returns: undefined;
      };
      create_lease: {
        Args: {
          p_slot_code: string;
          p_tenant_name: string;
          p_phone: string | null;
          p_plate: string | null;
          p_starts_on: string;
          p_note: string | null;
          p_paid_until: string;
          p_amount_cents: number;
          p_payment_method: Database["public"]["Enums"]["payment_method"];
        };
        Returns: string;
      };
      end_lease: {
        Args: { p_lease_id: string; p_ended_on: string };
        Returns: undefined;
      };
      extend_borrow: {
        Args: { p_session_id: string; p_minutes: number };
        Returns: {
          previous_borrow_until: string;
          current_borrow_until: string;
        }[];
      };
      undo_create_lease: { Args: { p_lease_id: string }; Returns: undefined };
      undo_end_lease: { Args: { p_lease_id: string }; Returns: undefined };
      undo_reservation: {
        Args: { p_reservation_id: string };
        Returns: undefined;
      };
      undo_cancel_reservation: {
        Args: { p_reservation_id: string };
        Returns: undefined;
      };
      undo_extend_borrow: {
        Args: {
          p_session_id: string;
          p_previous: string;
          p_expected_current: string;
        };
        Returns: undefined;
      };
      check_in_vehicle: {
        Args: {
          p_amount_cents?: number;
          p_billing_type: Database["public"]["Enums"]["billing_type"];
          p_borrow_minutes?: number;
          p_paid_until?: string;
          p_payment_method?: Database["public"]["Enums"]["payment_method"];
          p_plate: string;
          p_slot_code: string;
        };
        Returns: string;
      };
      check_out_vehicle: {
        Args: {
          p_amount_cents?: number;
          p_payment_method?: Database["public"]["Enums"]["payment_method"];
          p_session_id: string;
        };
        Returns: undefined;
      };
      consume_login_attempt: {
        Args: { p_ip_key: string };
        Returns: {
          allowed: boolean;
          retry_after_seconds: number;
        }[];
      };
      is_family_account: { Args: Record<PropertyKey, never>; Returns: boolean };
      reset_login_attempts: { Args: { p_ip_key: string }; Returns: undefined };
      undo_check_in: { Args: { p_session_id: string }; Returns: undefined };
      undo_check_out: { Args: { p_session_id: string }; Returns: undefined };
      undo_renewal: { Args: { p_payment_id: string }; Returns: undefined };
    };
    Enums: {
      billing_type: "hotel_daily" | "hourly" | "lease" | "free";
      payment_method: "wechat" | "alipay" | "cash";
      payment_purpose: "prepay" | "renewal" | "settlement";
      reservation_outcome: "arrived" | "cancelled";
      slot_kind: "regular" | "aisle" | "private";
      yard: "inner" | "outer";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      billing_type: ["hotel_daily", "hourly", "lease", "free"],
      payment_method: ["wechat", "alipay", "cash"],
      payment_purpose: ["prepay", "renewal", "settlement"],
      reservation_outcome: ["arrived", "cancelled"],
      slot_kind: ["regular", "aisle", "private"],
      yard: ["inner", "outer"],
    },
  },
} as const;
