import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { CheckOutFormData } from "internal/parking";
import { CheckOutForm } from "./CheckOutForm";

const hourly: CheckOutFormData = {
  code: "3",
  name: "3号",
  sessionId: "00000000-0000-4000-8000-000000000001",
  plate: "粤B12345",
  billingType: "hourly",
  enteredAt: "2026-11-20T01:00:00.000Z",
  now: "2026-11-20T03:10:00.000Z",
  paidUntil: null,
  totalPaidCents: 0,
  suggestedAmountCents: 1500,
  overstayHours: 0,
};
const noopAction = async () => ({});
const meta = {
  component: CheckOutForm,
  args: { form: hourly, action: noopAction, undoAction: noopAction },
  decorators: [
    (Story) => (
      <Box sx={{ width: 390, maxWidth: "100%", px: 2 }}>
        <Story />
      </Box>
    ),
  ],
  parameters: { layout: "fullscreen" },
  title: "Organisms/ParkingSessions/CheckOutForm",
} satisfies Meta<typeof CheckOutForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const HourlyCheckOut: Story = {};
export const HotelOverstayCheckOut: Story = {
  args: {
    form: {
      ...hourly,
      billingType: "hotel_daily",
      totalPaidCents: 9000,
      paidUntil: "2026-11-20T02:00:00.000Z",
      overstayHours: 2,
      suggestedAmountCents: 3000,
    },
  },
};
export const LeaseCheckOut: Story = {
  args: {
    form: {
      ...hourly,
      billingType: "lease",
      totalPaidCents: null,
      suggestedAmountCents: 0,
    },
  },
};
export const CheckOutSuccess: Story = {
  args: {
    initialState: {
      success: "离场成功",
      successKey: "done",
      result: { sessionId: hourly.sessionId },
    },
  },
};
