import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ActionState } from "types/actions";
import { RecordsView } from "./RecordsView";

const sample = {
  sessions: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      slot_code: "1",
      slotName: "1号",
      plate: "辽A12345",
      billing_type: "hotel_daily" as const,
      entered_at: "2026-11-21T02:00:00.000Z",
      left_at: null,
      session_payments: [
        {
          id: "00000000-0000-4000-8000-000000000002",
          amount_cents: 3000,
          method: "cash" as const,
          purpose: "prepay" as const,
          paid_at: "2026-11-21T02:00:00.000Z",
          paid_until: "2026-11-22T04:00:00.000Z",
        },
        {
          id: "00000000-0000-4000-8000-000000000004",
          amount_cents: 500,
          method: "wechat" as const,
          purpose: "settlement" as const,
          paid_at: "2026-11-21T04:00:00.000Z",
          paid_until: null,
        },
      ],
    },
  ],
  leasePayments: [],
};
const action = async (
  _state: ActionState,
  _data: FormData,
): Promise<ActionState> => ({ success: "更正已保存" });
const meta = {
  title: "Organisms/ParkingSessions/RecordsView",
  component: RecordsView,
  args: {
    filter: { kind: "date" as const, date: "2026-11-21" },
    records: sample,
    previousDate: "2026-11-20",
    nextDate: null,
    action,
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 390, maxWidth: "100%", p: 2 }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof RecordsView>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ByDate: Story = {};
export const ByPlate: Story = {
  args: { filter: { kind: "plate", plate: "辽A12345" } },
};
export const ByLease: Story = {
  args: {
    filter: { kind: "lease", searchBy: "tenant", query: "王先生" },
    records: {
      sessions: [],
      leasePayments: [
        {
          id: "00000000-0000-4000-8000-000000000003",
          amount_cents: 50000,
          method: "wechat" as const,
          purpose: "renewal" as const,
          paid_at: "2026-11-21T02:00:00.000Z",
          paid_until: "2026-12-21T04:00:00.000Z",
          leases: { slot_code: "2", tenant_name: "王先生", plate: null },
          slotName: "2号",
          tenantName: "王先生",
        },
      ],
    },
  },
};
export const Empty: Story = {
  args: { records: { sessions: [], leasePayments: [] } },
};
function openConfirmation(canvasElement: HTMLElement, label: string) {
  const buttons = Array.from(canvasElement.querySelectorAll("button"));
  buttons.find((button) => button.textContent === label)?.click();
}
export const ConfirmPlate: Story = {
  play: ({ canvasElement }) => {
    openConfirmation(canvasElement, "改车牌");
  },
};
export const ConfirmPayment: Story = {
  play: ({ canvasElement }) => {
    openConfirmation(canvasElement, "改金额");
  },
};
export const ConfirmDelete: Story = {
  play: ({ canvasElement }) => {
    openConfirmation(canvasElement, "删除");
  },
};
