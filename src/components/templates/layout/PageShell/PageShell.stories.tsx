import PhotoCameraOutlined from "@mui/icons-material/PhotoCameraOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PageShell } from "./PageShell";

const meta = {
  args: {
    children: <Typography>这里放车位地图。</Typography>,
    subtitle: "11月18日 周三",
    title: "途泊属",
  },
  component: PageShell,
  decorators: [
    (Story) => (
      <Box sx={{ width: 390 }}>
        <Story />
      </Box>
    ),
  ],
  parameters: { layout: "fullscreen" },
  title: "Templates/Layout/PageShell",
} satisfies Meta<typeof PageShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLongTitle: Story = {
  args: {
    title: "途泊属 · 今天的车位使用情况",
  },
};

export const WithPrimaryAction: Story = {
  args: {
    footer: (
      <Button
        fullWidth
        size="large"
        startIcon={<PhotoCameraOutlined />}
        variant="contained"
      >
        车进来
      </Button>
    ),
  },
};

export const SettingsWithBack: Story = {
  args: { title: "设置", backHref: "/" },
};
export const SlotSettingsWithBack: Story = {
  args: { title: "车位设置", backHref: "/settings" },
};
export const PricingWithBack: Story = {
  args: { title: "收费设置", backHref: "/settings" },
};
export const StatsWithBack: Story = {
  args: { title: "月统计", backHref: "/settings" },
};
export const RecordsWithBack: Story = {
  args: { title: "记录查询", backHref: "/settings" },
};
