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
      <Box sx={{ maxWidth: "100%", width: 390 }}>
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
