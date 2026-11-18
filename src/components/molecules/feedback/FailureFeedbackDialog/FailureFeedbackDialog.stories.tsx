import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { FailureFeedbackDialog } from "./FailureFeedbackDialog";

const meta = {
  component: FailureFeedbackDialog,
  title: "Molecules/Feedback/FailureFeedbackDialog",
  args: {
    state: { error: "访问码不对，请再试一次。", errorKey: "storybook-error" },
  },
} satisfies Meta<typeof FailureFeedbackDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const IncorrectAccessCode: Story = {};

export const RateLimited: Story = {
  args: {
    state: {
      error: "输错太多次了，请 15 分钟后再试。",
      errorKey: "rate-limit",
    },
  },
};
