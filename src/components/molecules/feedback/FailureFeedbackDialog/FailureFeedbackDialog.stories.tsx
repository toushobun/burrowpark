import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { sharedErrorMessages } from "internal/shared/errors/sharedErrorMessages";

import { FailureFeedbackDialog } from "./FailureFeedbackDialog";

const meta = {
  component: FailureFeedbackDialog,
  title: "Molecules/Feedback/FailureFeedbackDialog",
  args: {
    state: { error: "操作失败，请稍后再试。", errorKey: "storybook-error" },
  },
} satisfies Meta<typeof FailureFeedbackDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GenericFailure: Story = {};

export const ServiceUnavailable: Story = {
  args: {
    state: {
      error: sharedErrorMessages.authUnavailable,
      errorKey: "service-unavailable",
    },
  },
};
