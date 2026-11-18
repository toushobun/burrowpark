import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AccessCodeLoginForm } from "./AccessCodeLoginForm";

const meta = {
  component: AccessCodeLoginForm,
  title: "Organisms/Auth/AccessCodeLoginForm",
  args: {
    action: async () => ({
      error: "访问码不对，请再试一次。",
      errorKey: crypto.randomUUID(),
    }),
  },
} satisfies Meta<typeof AccessCodeLoginForm>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
