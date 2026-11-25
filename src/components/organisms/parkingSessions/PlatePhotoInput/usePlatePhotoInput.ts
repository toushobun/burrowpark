"use client";

import { useEffect, useRef, useState } from "react";

import { normalizePlate } from "internal/parking";

import { compressPhoto } from "./compressPhoto";

export type PlatePhotoStory = {
  previewUrl: string;
  status: "loading" | "filled" | "failed";
};

/** 进场和长租复用同一浏览器本地识别、超时、手工修改及照片清理逻辑。 */
export function usePlatePhotoInput(
  initialPlate: string,
  storyPhoto?: PlatePhotoStory,
) {
  const [plate, setPlate] = useState(initialPlate);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    storyPhoto?.previewUrl ?? null,
  );
  const [recognitionStatus, setRecognitionStatus] = useState<
    "idle" | "loading" | "recognizing" | "filled" | "suggestion" | "failed"
  >(storyPhoto?.status ?? "idle");
  const [recognizedPlate, setRecognizedPlate] = useState<string | null>(null);
  const manualPlateEdited = useRef(false);
  const recognitionSerial = useRef(0);
  const photoSubmitted = useRef(false);
  const autoFilledPlate = useRef<string | null>(null);
  const recognitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const photoUrlRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      recognitionSerial.current += 1;
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
      if (recognitionTimerRef.current) {
        clearTimeout(recognitionTimerRef.current);
      }
    },
    [],
  );

  const clearPhoto = () => {
    recognitionSerial.current += 1;
    // 换照或删照时不能继续使用上一张照片自动识别的车牌。
    if (autoFilledPlate.current !== null) {
      setPlate(initialPlate);
      autoFilledPlate.current = null;
      manualPlateEdited.current = false;
    }
    if (recognitionTimerRef.current) clearTimeout(recognitionTimerRef.current);
    recognitionTimerRef.current = null;
    setIsCompressing(false);
    setPhoto(null);
    setPhotoUrl(null);
    setRecognizedPlate(null);
    setRecognitionStatus("idle");
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    photoUrlRef.current = null;
  };

  const photoChosen = async (file: File | undefined) => {
    if (!file) return;
    clearPhoto();
    photoSubmitted.current = false;
    const serial = recognitionSerial.current;
    setIsCompressing(true);
    setRecognitionStatus("loading");

    // 压缩卡住超过 15 秒时允许手动提交，但完成后仍保留未提交的照片。
    const compressionTimer = setTimeout(() => {
      if (serial === recognitionSerial.current && !photoSubmitted.current)
        setIsCompressing(false);
    }, 15000);

    // import + 模型下载/初始化不受 15 秒识别时限限制。即便 90 秒后 UI 回退，
    // preloadPlateModels 仍留在 Worker 运行，后续重拍复用已完成的加载。
    let loadTimeout: ReturnType<typeof setTimeout> | null = null;
    const loadTask = import("internal/plateRecognition")
      .then(async (api) => {
        if (
          serial === recognitionSerial.current &&
          !photoSubmitted.current &&
          api.isPlateModelsReady()
        )
          setRecognitionStatus("recognizing");
        return { api, loaded: await api.preloadPlateModels() };
      })
      .catch(() => null);
    const loadDeadline = new Promise<null>((resolve) => {
      loadTimeout = setTimeout(() => {
        if (serial === recognitionSerial.current && !photoSubmitted.current)
          setRecognitionStatus("failed");
        resolve(null);
      }, 90000);
      recognitionTimerRef.current = loadTimeout;
    });
    try {
      const compressed = await compressPhoto(file);
      if (serial !== recognitionSerial.current || photoSubmitted.current)
        return;
      const preview = URL.createObjectURL(compressed);
      photoUrlRef.current = preview;
      setPhotoUrl(preview);
      setPhoto(compressed.size <= 2 * 1024 * 1024 ? compressed : null);
      setIsCompressing(false);
      clearTimeout(compressionTimer);

      const initialized = await Promise.race([loadTask, loadDeadline]);
      if (serial !== recognitionSerial.current || photoSubmitted.current)
        return;
      if (!initialized?.loaded) {
        setRecognitionStatus("failed");
        return;
      }
      setRecognitionStatus("recognizing");
      // Worker 自身亦有限时，这里额外覆盖 mock、异常及旧照片回写。
      let recognitionTimeout: ReturnType<typeof setTimeout> | null = null;
      const recognitionDeadline = new Promise<null>((resolve) => {
        recognitionTimeout = setTimeout(() => resolve(null), 15000);
        recognitionTimerRef.current = recognitionTimeout;
      });
      const result = await Promise.race([
        initialized.api.recognizePlate(compressed),
        recognitionDeadline,
      ]);
      if (recognitionTimeout) clearTimeout(recognitionTimeout);
      if (serial !== recognitionSerial.current || photoSubmitted.current)
        return;
      if (!result) {
        setRecognitionStatus("failed");
        return;
      }
      const normalized = normalizePlate(result);
      if (normalized.length < 2 || normalized.length > 10) {
        setRecognitionStatus("failed");
        return;
      }
      if (manualPlateEdited.current) {
        setRecognizedPlate(normalized);
        setRecognitionStatus("suggestion");
      } else {
        setPlate(normalized);
        autoFilledPlate.current = normalized;
        setRecognitionStatus("filled");
      }
    } catch {
      if (serial === recognitionSerial.current && !photoSubmitted.current)
        setRecognitionStatus("failed");
    } finally {
      clearTimeout(compressionTimer);
      if (loadTimeout) clearTimeout(loadTimeout);
      if (serial === recognitionSerial.current) {
        if (recognitionTimerRef.current === loadTimeout)
          recognitionTimerRef.current = null;
        setIsCompressing(false);
      }
    }
  };

  const changePlate = (value: string) => {
    manualPlateEdited.current = normalizePlate(value).length > 0;
    autoFilledPlate.current = null;
    setPlate(value.toUpperCase());
  };

  const applySuggestion = () => {
    if (!recognizedPlate) return;
    setPlate(recognizedPlate);
    autoFilledPlate.current = recognizedPlate;
    setRecognitionStatus("filled");
  };

  const markSubmitted = () => {
    photoSubmitted.current = true;
    setIsCompressing(false);
    // 提交时停止识别回写，提交失败后也不能一直显示识别中。
    setRecognitionStatus((status) =>
      status === "loading" || status === "recognizing" ? "idle" : status,
    );
  };

  return {
    plate,
    photo,
    photoUrl,
    isCompressing,
    recognitionStatus,
    recognizedPlate,
    changePlate,
    applySuggestion,
    markSubmitted,
    clearPhoto,
    photoChosen,
  };
}
