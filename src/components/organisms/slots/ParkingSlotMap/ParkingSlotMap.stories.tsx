import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

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

export const Highlighted: Story = {
  args: {
    highlightCode: "12",
    slots: emptySlots.map((slot) =>
      slot.code === "12" ? { ...slot, status: "occupied" } : slot,
    ),
  },
};

/** 默认左侧外院，展示滑动选中底块及左侧边界；通过任一切换控件可查看里院。 */
export const YardNavigation: Story = {};

export const InnerYard: Story = {
  args: { highlightCode: "25" },
};

export const NarrowScreen: Story = {
  decorators: [
    (Story) => (
      <Box sx={{ maxWidth: "100%", width: 360 }}>
        <Story />
      </Box>
    ),
  ],
};
