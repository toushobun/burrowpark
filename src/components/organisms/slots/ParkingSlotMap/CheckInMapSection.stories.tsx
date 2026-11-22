import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CheckInMapSection } from "./CheckInMapSection";
import { emptySlotMapSlots } from "./ParkingSlotMap.fixtures";

const slots = emptySlotMapSlots.map((slot) =>
  slot.code === "12" ? { ...slot, status: "occupied" as const } : slot,
);
const meta = {
  component: CheckInMapSection,
  args: {
    slots,
    undoAction: async () => ({}),
    notice: {
      code: "12",
      sessionId: "00000000-0000-4000-8000-000000000001",
      plate: "辽A12345",
      slotName: "12号",
      photoSaved: true,
    },
  },
  decorators: [(Story) => <Box sx={{ width: 390 }}><Story /></Box>],
  parameters: { layout: "fullscreen" },
  title: "Organisms/Slots/CheckInMapSection",
} satisfies Meta<typeof CheckInMapSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const JustCheckedIn: Story = {};
export const PhotoUploadFailed: Story = {
  args: { notice: { ...meta.args.notice, photoSaved: false } },
};
