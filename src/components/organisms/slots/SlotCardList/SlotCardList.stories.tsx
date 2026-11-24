import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { slotStatuses } from "theme/slotStatusTokens";

import { emptySlotMapSlots } from "../ParkingSlotMap/ParkingSlotMap.fixtures";
import { SlotCardList } from "./SlotCardList";

const meta = {
  component: SlotCardList,
  args: {
    slots: emptySlotMapSlots.map((slot, index) => ({
      ...slot,
      status: slotStatuses[index % slotStatuses.length],
      plate: "辽AD98765",
    })),
  },
  decorators: [(Story) => <Box sx={{ width: 390, maxWidth: "100%" }}><Story /></Box>],
  title: "Organisms/Slots/SlotCardList",
} satisfies Meta<typeof SlotCardList>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Outer: Story = {};
export const Inner: Story = { args: { highlightCode: "25" } };
