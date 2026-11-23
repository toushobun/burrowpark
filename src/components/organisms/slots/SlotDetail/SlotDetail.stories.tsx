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
  args: {
    detail: emptyDetail,
    display: detailDisplay,
    now: "2026-11-19T04:00:00.000Z",
    today: "2026-11-19",
  },
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

export const ProminentActions: Story = {
  args: { detail: emptyDetail },
};

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

export const Reserved: Story = {
  args: {
    detail: {
      ...emptyDetail,
      status: "reserved",
      reservation: {
        id: "00000000-0000-4000-8000-000000000007",
        guestName: "张女士",
        note: "下午五点到",
      },
    },
  },
};
export const LeaseOccupied: Story = {
  args: {
    detail: {
      ...leaseAwayDetail,
      status: "occupied",
      presentVehicle: {
        ...hotelExpiringDetail.presentVehicle!,
        billingType: "lease",
      },
    },
  },
};
export const ReserveRedirecting: Story = {
  args: {
    detail: {
      ...emptyDetail,
      status: "reserved",
      reservation: {
        id: "00000000-0000-4000-8000-000000000007",
        guestName: "张女士",
        note: null,
      },
    },
    initialState: {
      reserve: {
        success: "预留成功",
        result: { id: "00000000-0000-4000-8000-000000000007" },
      },
    },
  },
};
export const CancelReservationSuccess: Story = {
  args: {
    detail: {
      ...emptyDetail,
      status: "reserved",
      reservation: {
        id: "00000000-0000-4000-8000-000000000007",
        guestName: "张女士",
        note: null,
      },
    },
    initialState: {
      cancel: {
        success: "已取消预留",
        result: { id: "00000000-0000-4000-8000-000000000007" },
      },
    },
  },
};
export const ExtendBorrowSuccess: Story = {
  args: {
    detail: privateBorrowedDetail,
    initialState: {
      extend: {
        success: "借用已延长",
        result: {
          id: "00000000-0000-4000-8000-000000000005",
          previous: "2026-11-19T04:00:00.000Z",
          current: "2026-11-19T04:10:00.000Z",
        },
      },
    },
  },
};
export const EndLeaseSuccess: Story = {
  args: {
    detail: leaseAwayDetail,
    initialState: {
      end: {
        success: "退租成功",
        result: { id: "00000000-0000-4000-8000-000000000006" },
      },
    },
  },
};
