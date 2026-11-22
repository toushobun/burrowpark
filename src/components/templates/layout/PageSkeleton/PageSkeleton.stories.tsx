import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PageSkeleton } from "./PageSkeleton";

const meta = {
  component: PageSkeleton,
  args: { title: "加载中…", rows: 4 },
  decorators: [(Story) => <Box sx={{ width: 390 }}><Story /></Box>],
  parameters: { layout: "fullscreen" },
  title: "Templates/Layout/PageSkeleton",
} satisfies Meta<typeof PageSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Pricing: Story = { args: { title: "收费设置", backHref: "/settings", rows: 5 } };
export const SlotDetail: Story = { args: { title: "加载中…", rows: 4 } };
