import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { OperationRedirecting } from "./OperationRedirecting";

const meta = {
  component: OperationRedirecting,
  decorators: [
    (Story) => (
      <Box sx={{ width: 390, maxWidth: "100%", px: 2 }}>
        <Story />
      </Box>
    ),
  ],
  parameters: { layout: "fullscreen" },
  title: "Molecules/Feedback/OperationRedirecting",
} satisfies Meta<typeof OperationRedirecting>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReturningToMap: Story = {};
