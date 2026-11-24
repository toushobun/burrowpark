import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { OperationToast } from "./OperationToast";

const notice = {
  kind: "checkin" as const,
  code: "12",
  id: "00000000-0000-4000-8000-000000000001",
  message: "已登记 12号 辽A·12345",
  photoSaved: true,
};
const noopAction = async () => ({});
const undoActions = {
  checkin: noopAction,
  reserve: noopAction,
  lease: noopAction,
  checkout: noopAction,
  renew: noopAction,
  cancel: noopAction,
  extend: noopAction,
  end: noopAction,
};
const meta = {
  component: OperationToast,
  args: { notice, undoActions, onUndone: () => {} },
  decorators: [
    (Story) => (
      <Box sx={{ width: 390, height: 844 }}>
        <Story />
      </Box>
    ),
  ],
  parameters: { layout: "fullscreen" },
  title: "Organisms/Slots/OperationToast",
} satisfies Meta<typeof OperationToast>;

export default meta;
type Story = StoryObj<typeof OperationToast>;

export const CheckIn: Story = {};
export const PhotoFailed: Story = {
  args: { notice: { ...notice, photoSaved: false } },
};
export const Reserved: Story = {
  args: {
    notice: {
      ...notice,
      kind: "reserve",
      message: "已预留 12号（张三）",
    },
  },
};
export const Leased: Story = {
  args: {
    notice: {
      ...notice,
      kind: "lease",
      message: "12号已设为长租（张三）",
    },
  },
};
export const CheckOut: Story = {
  args: {
    notice: { ...notice, kind: "checkout", message: "离场成功：辽A·12345" },
  },
};
export const Renewal: Story = {
  args: {
    notice: {
      ...notice,
      kind: "renew",
      message: "续费成功，交到 11月25日 12:00",
    },
  },
};
export const EditedLease: Story = {
  args: {
    notice: { ...notice, kind: "edit", message: "长租资料已保存" },
  },
};
export const LongTenantName: Story = {
  args: {
    notice: {
      ...notice,
      kind: "lease",
      message: "12号已设为长租（ABC国际贸易公司长期租赁客户）",
    },
  },
};
export const Undone: Story = {
  args: {
    initialState: { success: "已撤销", successKey: "storybook-undo" },
  },
};
