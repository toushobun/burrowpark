import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  emptyDetail,
  leaseAwayDetail,
} from "../SlotDetail/SlotDetail.fixtures";
import { photoPreview } from "organisms/parkingSessions/PlatePhotoInput/PlatePhotoInput.fixtures";
import { LeaseForm } from "./LeaseForm";

const action = async () => ({
  success: "操作成功",
  result: {
    id: "00000000-0000-4000-8000-000000000001",
  },
});

const meta = {
  component: LeaseForm,
  title: "Organisms/Slots/LeaseForm",
  args: {
    mode: "create",
    detail: emptyDetail,
    today: "2026-11-19",
    action,
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 390, maxWidth: "100%", px: 2 }}>
        <Story />
      </Box>
    ),
  ],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof LeaseForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Create: Story = {};
export const CreateSuccess: Story = {
  args: {
    detail: leaseAwayDetail,
    initialState: {
      success: "长租建立成功",
      result: { id: "00000000-0000-4000-8000-000000000006" },
    },
  },
};
export const Edit: Story = { args: { mode: "edit", detail: leaseAwayDetail } };
export const Unavailable: Story = {
  args: { detail: { ...emptyDetail, kind: "private", status: "privateIdle" } },
};

export const PhotoRecognizing: Story = {
  args: { storyPhoto: { previewUrl: photoPreview, status: "loading" } },
};

export const PhotoRecognitionFailed: Story = {
  args: { storyPhoto: { previewUrl: photoPreview, status: "failed" } },
};
