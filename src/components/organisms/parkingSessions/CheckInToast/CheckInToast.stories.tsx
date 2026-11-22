import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CheckInToast } from "./CheckInToast";

const notice = {
  code: "12",
  sessionId: "00000000-0000-4000-8000-000000000001",
  plate: "辽A12345",
  slotName: "12号",
  photoSaved: true,
};
const noopAction = async () => ({});
const meta = {
  component: CheckInToast,
  args: { notice, undoAction: noopAction, onUndone: () => {} },
  decorators: [
    (Story) => (
      <Box sx={{ width: 390, height: 844 }}>
        <Story />
      </Box>
    ),
  ],
  parameters: { layout: "fullscreen" },
  title: "Organisms/ParkingSessions/CheckInToast",
} satisfies Meta<typeof CheckInToast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {};
export const PhotoFailed: Story = {
  args: { notice: { ...notice, photoSaved: false } },
};
export const Undone: Story = {
  args: {
    initialState: { success: "已撤销", successKey: "storybook-undo" },
  },
};
