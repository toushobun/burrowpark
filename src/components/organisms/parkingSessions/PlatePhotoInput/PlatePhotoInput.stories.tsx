import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PlatePhotoInput } from "./PlatePhotoInput";
import { photoPreview } from "./PlatePhotoInput.fixtures";
import { usePlatePhotoInput } from "./usePlatePhotoInput";

function PlatePhotoStory() {
  const capture = usePlatePhotoInput("", {
    previewUrl: photoPreview,
    status: "failed",
  });
  return (
    <PlatePhotoInput
      capture={capture}
      disabled={false}
      label="常停车牌"
      purpose="lease"
    />
  );
}

const meta = {
  component: PlatePhotoStory,
  title: "Organisms/ParkingSessions/PlatePhotoInput",
} satisfies Meta<typeof PlatePhotoStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LeaseRecognitionFailed: Story = {};
