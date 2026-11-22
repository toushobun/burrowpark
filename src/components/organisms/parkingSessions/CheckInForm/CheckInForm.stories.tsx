import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { CheckInFormData } from "internal/parking";

import { CheckInForm } from "./CheckInForm";

const now = "2026-11-20T03:00:00.000Z";
const empty: CheckInFormData = {
  code: "3",
  name: "3号",
  kind: "regular",
  isActive: true,
  occupied: false,
  hasLease: false,
  hasReservation: false,
  pricing: {
    hotel_daily_price_cents: 3000,
    hotel_checkout_hour: 12,
    hotel_previous_day_before_hour: 6,
    hourly_price_cents: 500,
  },
  now,
};

const noopAction = async () => ({});
const meta = {
  component: CheckInForm,
  args: {
    form: empty,
    action: noopAction,
  },
  decorators: [
    (Story) => (
      <Box sx={{ maxWidth: "100%", px: 2, width: 390 }}>
        <Story />
      </Box>
    ),
  ],
  parameters: { layout: "fullscreen" },
  title: "Organisms/ParkingSessions/CheckInForm",
} satisfies Meta<typeof CheckInForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptySlot: Story = {};
export const PrivateSlot: Story = {
  args: { form: { ...empty, kind: "private", name: "7号", code: "7" } },
};
export const ActiveLease: Story = {
  args: { form: { ...empty, hasLease: true } },
};
export const WithReservation: Story = {
  args: { form: { ...empty, hasReservation: true } },
};
export const ConflictFailure: Story = {
  args: {
    initialState: {
      error: "这个车位刚刚被登记了",
      errorKey: "storybook-conflict",
    },
  },
};
const photoPreview =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180">' +
      '<rect width="320" height="180" fill="#e2e8f0"/>' +
      '<rect x="45" y="60" width="230" height="70" rx="10" fill="#94a3b8"/>' +
      '<rect x="110" y="95" width="100" height="30" rx="3" fill="#f8fafc"/>' +
      '<text x="125" y="116" font-size="16" fill="#334155">辽A12345</text></svg>',
  );

export const PhotoRecognizing: Story = {
  args: { storyPhoto: { previewUrl: photoPreview, status: "loading" } },
};
export const PhotoRecognized: Story = {
  args: {
    form: { ...empty, defaultLeasePlate: "辽A12345" },
    storyPhoto: { previewUrl: photoPreview, status: "filled" },
  },
};
export const PhotoRecognitionFailed: Story = {
  args: { storyPhoto: { previewUrl: photoPreview, status: "failed" } },
};
