import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { HomeNavigation } from "./HomeNavigation";

const meta = {
  component: HomeNavigation,
  title: "Molecules/Navigation/HomeNavigation",
} satisfies Meta<typeof HomeNavigation>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Home: Story = {};
export const Reminders: Story = { args: { active: "reminders" } };
export const Profile: Story = { args: { active: "profile" } };
