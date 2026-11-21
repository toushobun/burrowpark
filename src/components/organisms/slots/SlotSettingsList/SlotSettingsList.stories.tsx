import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { SlotSettingsRow } from "internal/parking";
import { SlotSettingsList } from "./SlotSettingsList";

const action = async () => ({ success: "车位设置已更新" });

const rows: SlotSettingsRow[] = Array.from({ length: 29 }, (_, index) => ({
  code: String(index + 1),
  name: String(index + 1) + "号",
  kind: index === 6 ? ("private" as const) : ("regular" as const),
  isActive: index !== 8,
  blockedReason:
    index === 0
      ? "occupied"
      : index === 1
        ? "reserved"
        : index === 2
          ? "leased"
          : null,
}));

const meta = {
  component: SlotSettingsList,
  title: "Organisms/Slots/SlotSettingsList",
  args: { rows, action },
  decorators: [
    (Story) => (
      <Box sx={{ width: 390, maxWidth: "100%", px: 2 }}>
        <Story />
      </Box>
    ),
  ],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof SlotSettingsList>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const OneSlot: Story = { args: { rows: [rows[3]] } };
export const Blocked: Story = { args: { rows: rows.slice(0, 3) } };
