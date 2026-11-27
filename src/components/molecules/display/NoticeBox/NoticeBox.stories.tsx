import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { NoticeBox } from "./NoticeBox";

const meta = {
  component: NoticeBox,
  title: "Molecules/Display/NoticeBox",
  args: {
    title: "交到 11月26日 12:00",
    children: "建议金额：30.00 元",
  },
} satisfies Meta<typeof NoticeBox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
