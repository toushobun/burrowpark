import PhotoCameraOutlined from "@mui/icons-material/PhotoCameraOutlined";
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
  parameters: { layout: "fullscreen" },
  title: "Templates/Layout/PageShell",
} satisfies Meta<typeof PageShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

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
