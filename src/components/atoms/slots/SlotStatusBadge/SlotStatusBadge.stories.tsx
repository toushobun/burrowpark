import Stack from "@mui/material/Stack";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { slotStatuses } from "theme/slotStatusTokens";

import { SlotStatusBadge } from "./SlotStatusBadge";

const meta = {
  args: { status: "empty" },
  argTypes: {
    status: { control: "select", options: slotStatuses },
  },
  component: SlotStatusBadge,
  title: "Atoms/Slots/SlotStatusBadge",
} satisfies Meta<typeof SlotStatusBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomLabel: Story = {
  args: { label: "剩 6 分钟", status: "privateBorrowed" },
};

export const AllStatuses: Story = {
  render: () => (
    <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }} useFlexGap>
      {slotStatuses.map((status) => (
        <SlotStatusBadge key={status} status={status} />
      ))}
    </Stack>
  ),
};
