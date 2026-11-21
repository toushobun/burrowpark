import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { MonthlyStats } from "./MonthlyStats";
import { emptyStats, populatedStats } from "./MonthlyStats.fixtures";

const meta = {
  component: MonthlyStats,
  title: "Organisms/Stats/MonthlyStats",
  args: {
    month: "2026-11",
    currentMonth: "2026-12",
    stats: populatedStats,
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 390, maxWidth: "100%", px: 2 }}>
        <Story />
      </Box>
    ),
  ],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof MonthlyStats>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithPayments: Story = {};
export const Empty: Story = { args: { stats: emptyStats } };
export const CurrentMonth: Story = {
  args: { currentMonth: "2026-11" },
};
