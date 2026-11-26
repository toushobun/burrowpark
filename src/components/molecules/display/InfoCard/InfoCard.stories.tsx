import Typography from "@mui/material/Typography";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { InfoCard } from "./InfoCard";

const meta = {
  component: InfoCard,
  title: "Molecules/Display/InfoCard",
  args: { children: <Typography>收款合计：150.00 元</Typography> },
} satisfies Meta<typeof InfoCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
