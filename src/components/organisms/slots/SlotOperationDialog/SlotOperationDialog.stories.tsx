import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SlotDetail } from "../SlotDetail/SlotDetail";
import { detailDisplay, emptyDetail } from "../SlotDetail/SlotDetail.fixtures";
import { SlotOperationDialog } from "./SlotOperationDialog";

const meta = {
  component: SlotOperationDialog,
  title: "Organisms/Slots/SlotOperationDialog",
  args: {
    code: "7",
    children: (
      <SlotDetail
        detail={emptyDetail}
        display={detailDisplay}
        modalForms={{
          "check-in": <div>登记进场表单</div>,
          "lease/new": <div>长租表单</div>,
        }}
      />
    ),
  },
} satisfies Meta<typeof SlotOperationDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptySlot: Story = {};
