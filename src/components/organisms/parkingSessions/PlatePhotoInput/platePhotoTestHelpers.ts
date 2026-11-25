import { fireEvent } from "@testing-library/react";
import { vi } from "vitest";

import {
  isPlateModelsReady,
  preloadPlateModels,
  recognizePlate,
} from "internal/plateRecognition";

import { compressPhoto } from "./compressPhoto";

export function resetPlatePhotoMocks() {
  vi.mocked(recognizePlate).mockReset();
  vi.mocked(preloadPlateModels).mockReset();
  vi.mocked(preloadPlateModels).mockResolvedValue(true);
  vi.mocked(isPlateModelsReady).mockReturnValue(true);
  vi.mocked(compressPhoto).mockReset();
  vi.mocked(compressPhoto).mockResolvedValue(
    new Blob(["jpeg"], { type: "image/jpeg" }),
  );
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:test-photo"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
}

export function choosePhoto(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]');
  if (!input) throw new Error("缺少拍照输入框");
  fireEvent.change(input, {
    target: {
      files: [new File(["photo"], "photo.png", { type: "image/png" })],
    },
  });
}
