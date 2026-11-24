import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { HomeHeader } from "./HomeHeader";

const meta = {
  component: HomeHeader,
  args: { hasReminders: true },
  title: "Molecules/Navigation/HomeHeader",
} satisfies Meta<typeof HomeHeader>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Pending: Story = {};
export const Clear: Story = { args: { hasReminders: false } };
