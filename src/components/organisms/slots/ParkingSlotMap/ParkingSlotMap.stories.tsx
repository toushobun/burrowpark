import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import { slotStatuses } from "theme/slotStatusTokens";

import { ParkingSlotMap } from "./ParkingSlotMap";
import { emptySlotMapSlots } from "./ParkingSlotMap.fixtures";

const emptySlots = emptySlotMapSlots;

const meta = {
  args: { slots: emptySlots },
  component: ParkingSlotMap,
  decorators: [
    (Story) => (
      <Box sx={{ maxWidth: "100%", px: 2, width: 390 }}>
        <Story />
      </Box>
    ),
  ],
  parameters: { layout: "fullscreen" },
  title: "Organisms/Slots/ParkingSlotMap",
} satisfies Meta<typeof ParkingSlotMap>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Full: Story = {
  args: {
    slots: emptySlots.map((slot) => ({ ...slot, status: "occupied" })),
  },
};

export const Mixed: Story = {
  args: {
    slots: emptySlots.map((slot, index) => ({
      ...slot,
      isActive: slot.code !== "8",
      status: slotStatuses[index % slotStatuses.length],
    })),
  },
};

// 模拟 390px 手机，在交互步骤中切换到可手指滑动的放大视图。
export const Zoomed: Story = {
  args: {
    slots: emptySlots.map((slot, index) => ({
      ...slot,
      status: slotStatuses[index % slotStatuses.length],
    })),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "放大查看" }));
  },
};
