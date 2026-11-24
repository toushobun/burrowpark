import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { RenewFormData } from "internal/parking";
import { RenewForm } from "./RenewForm";

const hotel: RenewFormData = {
  code: "3",
  name: "3号",
  mode: "hotel_daily",
  sessionId: "00000000-0000-4000-8000-000000000001",
  leaseId: null,
  paidUntil: "2026-11-20T04:00:00.000Z",
  defaultEndDate: null,
  hotelDailyPriceCents: 3000,
  plate: "粤B12345",
};
const noopAction = async () => ({});
const meta = {
  component: RenewForm,
  args: { form: hotel, action: noopAction },
  decorators: [
    (Story) => (
      <Box sx={{ width: 390, maxWidth: "100%", px: 2 }}>
        <Story />
      </Box>
    ),
  ],
  parameters: { layout: "fullscreen" },
  title: "Organisms/ParkingSessions/RenewForm",
} satisfies Meta<typeof RenewForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const HotelRenewal: Story = {};
export const ExpiredHotelRenewal: Story = {
  args: { form: { ...hotel, paidUntil: "2026-10-20T04:00:00.000Z" } },
};
export const LeaseRenewal: Story = {
  args: {
    form: {
      ...hotel,
      mode: "lease",
      sessionId: null,
      leaseId: "00000000-0000-4000-8000-000000000002",
      paidUntil: "2026-11-22T15:59:59.000Z",
      defaultEndDate: "2026-12-22",
      plate: null,
    },
  },
};
export const RenewalRedirecting: Story = {
  args: {
    initialState: {
      success: "续费成功",
      successKey: "done",
      result: {
        paymentId: "00000000-0000-4000-8000-000000000003",
        paidUntil: "2026-11-23T04:00:00.000Z",
      },
    },
  },
};
