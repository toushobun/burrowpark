import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { CheckInFormData } from "internal/parking";

import { CheckInForm } from "./CheckInForm";

const now = "2026-11-20T03:00:00.000Z";
const empty: CheckInFormData = {
  code: "3",
  name: "3号",
  kind: "regular",
  isActive: true,
  occupied: false,
  hasLease: false,
  hasReservation: false,
  pricing: {
    hotel_daily_price_cents: 3000,
    hotel_checkout_hour: 12,
    hotel_previous_day_before_hour: 6,
    hourly_price_cents: 500,
  },
  now,
};

const noopAction = async () => ({});
const meta = {
  component: CheckInForm,
  args: {
    form: empty,
    action: noopAction,
    undoAction: noopAction,
  },
  decorators: [
    (Story) => (
      <Box sx={{ maxWidth: "100%", px: 2, width: 390 }}>
        <Story />
      </Box>
    ),
  ],
  parameters: { layout: "fullscreen" },
  title: "Organisms/ParkingSessions/CheckInForm",
} satisfies Meta<typeof CheckInForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptySlot: Story = {};
export const PrivateSlot: Story = {
  args: { form: { ...empty, kind: "private", name: "7号", code: "7" } },
};
export const ActiveLease: Story = {
  args: { form: { ...empty, hasLease: true } },
};
export const WithReservation: Story = {
  args: { form: { ...empty, hasReservation: true } },
};
export const ConflictFailure: Story = {
  args: {
    initialState: {
      error: "这个车位刚刚被登记了",
      errorKey: "storybook-conflict",
    },
  },
};
export const CheckInSuccess: Story = {
  args: {
    initialState: {
      success: "登记成功",
      successKey: "storybook-success",
      result: {
        sessionId: "00000000-0000-4000-8000-000000000001",
        plate: "粤B12345",
      },
    },
  },
};
