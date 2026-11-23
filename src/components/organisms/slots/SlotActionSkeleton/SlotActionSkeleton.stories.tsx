import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SlotActionSkeleton } from "./SlotActionSkeleton";

const meta = {
  component: SlotActionSkeleton,
  args: { title: "续费", rows: 5 },
  decorators: [
    (Story) => (
      <Box sx={{ width: 390 }}>
        <Story />
      </Box>
    ),
  ],
  parameters: { layout: "fullscreen" },
  title: "Organisms/Slots/SlotActionSkeleton",
} satisfies Meta<typeof SlotActionSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Renew: Story = {};
