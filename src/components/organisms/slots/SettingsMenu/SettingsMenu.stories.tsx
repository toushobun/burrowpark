import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SettingsMenu } from "./SettingsMenu";

const meta = {
  component: SettingsMenu,
  title: "Organisms/Slots/SettingsMenu",
  decorators: [
    (Story) => (
      <Box sx={{ width: 390, maxWidth: "100%", px: 2 }}>
        <Story />
      </Box>
    ),
  ],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof SettingsMenu>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
