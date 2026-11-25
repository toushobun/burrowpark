import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { slotStatusColors } from "theme/slotStatusTokens";

import { SlotDetail } from "../SlotDetail/SlotDetail";
import { detailDisplay, emptyDetail } from "../SlotDetail/SlotDetail.fixtures";
import { SlotOperationDialog } from "./SlotOperationDialog";

const meta = {
  component: SlotOperationDialog,
  title: "Organisms/Slots/SlotOperationDialog",
  args: {
    origin: "280px 100px",
    onClosed: () => {},
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

export const FromMapPosition: Story = {
  decorators: [
    (Story) => (
      <>
        <svg width="100%" height="240" aria-label="车位地图">
          <g>
            <rect
              x="240"
              y="70"
              width="80"
              height="60"
              fill={slotStatusColors.empty.background}
            />
            <text x="280" y="105" textAnchor="middle">
              7
            </text>
          </g>
        </svg>
        <Story />
      </>
    ),
  ],
};
