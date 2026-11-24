import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [],
  staticDirs: [{ from: "../public/icons", to: "/icons" }],
  framework: "@storybook/nextjs-vite",
};
export default config;
