import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { HomeNavigation } from "./HomeNavigation";

const meta = {
  component: HomeNavigation,
  title: "Molecules/Navigation/HomeNavigation",
} satisfies Meta<typeof HomeNavigation>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Slots: Story = {
  parameters: { nextjs: { navigation: { pathname: "/" } } },
};
export const Reminders: Story = {
  parameters: { nextjs: { navigation: { pathname: "/reminders" } } },
};
export const Profile: Story = {
  parameters: { nextjs: { navigation: { pathname: "/settings" } } },
};
