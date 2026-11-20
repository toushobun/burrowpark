import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SlotDetail } from "./SlotDetail";
import {
  detailDisplay,
  emptyDetail,
  hotelExpiringDetail,
  hourlyDetail,
  leaseAwayDetail,
  privateBorrowedDetail,
} from "./SlotDetail.fixtures";

const meta = {
  component: SlotDetail,
  args: { detail: emptyDetail, display: detailDisplay },
  decorators: [
    (Story) => (
      <Box sx={{ maxWidth: "100%", px: 2, width: 390 }}>
        <Story />
      </Box>
    ),
  ],
  parameters: { layout: "fullscreen" },
  title: "Organisms/Slots/SlotDetail",
} satisfies Meta<typeof SlotDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const HotelExpiring: Story = {
  args: { detail: hotelExpiringDetail },
};

export const Hourly: Story = {
  args: { detail: hourlyDetail },
};

export const LeaseAway: Story = {
  args: { detail: leaseAwayDetail },
};

export const PrivateBorrowed: Story = {
  args: { detail: privateBorrowedDetail },
};

export const PrivateBorrowOverdue: Story = {
  args: {
    detail: { ...privateBorrowedDetail, status: "overdue" },
  },
};

export const Missing: Story = {
  args: { detail: null, display: null },
};
