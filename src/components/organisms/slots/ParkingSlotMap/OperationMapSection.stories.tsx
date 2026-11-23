import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { OperationMapSection } from "./OperationMapSection";
import { emptySlotMapSlots } from "./ParkingSlotMap.fixtures";

const slots = emptySlotMapSlots.map((slot) =>
  slot.code === "12" ? { ...slot, status: "occupied" as const } : slot,
);
const noopAction = async () => ({});
const meta = {
  component: OperationMapSection,
  args: {
    slots,
    undoActions: {
      checkin: noopAction,
      reserve: noopAction,
      lease: noopAction,
    },
    notice: {
      kind: "checkin",
      code: "12",
      id: "00000000-0000-4000-8000-000000000001",
      message: "已登记 12号 辽A·12345",
      photoSaved: true,
    },
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 390 }}>
        <Story />
      </Box>
    ),
  ],
  parameters: { layout: "fullscreen" },
  title: "Organisms/Slots/OperationMapSection",
} satisfies Meta<typeof OperationMapSection>;

export default meta;
type Story = StoryObj<typeof OperationMapSection>;

export const JustCheckedIn: Story = {};
export const PhotoUploadFailed: Story = {
  args: { notice: { ...meta.args.notice, photoSaved: false } },
};
export const JustReserved: Story = {
  args: {
    slots: emptySlotMapSlots.map((slot) =>
      slot.code === "12" ? { ...slot, status: "reserved" } : slot,
    ),
    notice: {
      ...meta.args.notice,
      kind: "reserve",
      message: "已预留 12号（张三）",
    },
  },
};
export const JustLeased: Story = {
  args: {
    slots: emptySlotMapSlots.map((slot) =>
      slot.code === "12" ? { ...slot, status: "leaseAway" } : slot,
    ),
    notice: {
      ...meta.args.notice,
      kind: "lease",
      message: "12号已设为长租（张三）",
    },
  },
};
