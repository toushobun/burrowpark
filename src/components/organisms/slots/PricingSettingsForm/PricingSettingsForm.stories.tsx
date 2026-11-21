import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ActionState } from "types/actions";
import { PricingSettingsForm } from "./PricingSettingsForm";

const initial = {
  hotel_daily_price_cents: 3000, hotel_checkout_hour: 12,
  hotel_previous_day_before_hour: 6, hourly_price_cents: 500,
};
const meta = {
  component: PricingSettingsForm,
  title: "Organisms/Slots/PricingSettingsForm",
  args: {
    initial,
    action: async (_prev: ActionState, _form: FormData): Promise<ActionState> => ({ success: "已保存" }),
  },
  decorators: [(Story) => <Box sx={{ width: 390, maxWidth: "100%", px: 2 }}><Story /></Box>],
} satisfies Meta<typeof PricingSettingsForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const CurrentValues: Story = {};
export const SaveConfirm: Story = {};
export const SaveSuccess: Story = {};
export const ValidationFailure: Story = {
  args: { action: async (): Promise<ActionState> => ({ error: "实收金额必须大于 0", errorKey: "preview" }) },
};
