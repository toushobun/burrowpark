import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { SlotReminder } from "internal/parking";
import { SlotReminders } from "./SlotReminders";

const mixed: SlotReminder[] = [
  {
    code: "2",
    name: "2号",
    displayName: "粤B·00002",
    status: "overdue",
    deadline: "2026-11-20T02:00:00.000Z",
    description: "超时 2 小时",
  },
  {
    code: "3",
    name: "3号",
    displayName: "粤B·00003",
    status: "expiringSoon",
    deadline: "2026-11-20T04:00:00.000Z",
    description: "今天 12:00 到期",
  },
  {
    code: "7",
    name: "7号",
    displayName: "粤B·00007",
    status: "privateBorrowed",
    deadline: "2026-11-20T04:03:00.000Z",
    description: "借用还剩 3 分钟",
  },
];

const leaseOnly: SlotReminder[] = [
  {
    code: "4",
    name: "4号",
    displayName: "王先生",
    status: "overdue",
    deadline: "2026-11-18T15:59:59.000Z",
    description: "超时 2 天",
  },
];

const meta = {
  component: SlotReminders,
  args: { reminders: [] },
  decorators: [
    (Story) => (
      <Box sx={{ width: 390, maxWidth: "100%", px: 2 }}>
        <Story />
      </Box>
    ),
  ],
  parameters: { layout: "fullscreen" },
  title: "Organisms/Slots/SlotReminders",
} satisfies Meta<typeof SlotReminders>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoReminders: Story = {};
export const MixedReminders: Story = { args: { reminders: mixed } };
export const LeaseOnly: Story = { args: { reminders: leaseOnly } };
