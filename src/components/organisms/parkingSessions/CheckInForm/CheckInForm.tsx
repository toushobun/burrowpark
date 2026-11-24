"use client";

import CameraAltIcon from "@mui/icons-material/CameraAlt";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  checkInBillingTypeOrder,
  checkInText,
  paymentMethodLabels,
} from "config/checkInText";
import { commonText } from "config/commonText";
import { billingTypeLabels } from "config/slotDetailText";
import type { CheckInFormData, ParkingBillingType } from "internal/parking";
import {
  calculateHotelCheckoutAt,
  formatBusinessDateTime,
  formatPlateForDisplay,
  isValidCheckInPhone,
  normalizePlate,
} from "internal/parking";
import type { CheckInActionState } from "internal/parking/adapter/next/checkInActions";
import { FailureFeedbackDialog } from "molecules/feedback/FailureFeedbackDialog/FailureFeedbackDialog";
import { designTokens } from "theme/designTokens";

import { compressPhoto } from "./compressPhoto";
import { photoUploadFailed } from "./photoUploadStatus";

type Props = {
  form: CheckInFormData | null;
  action: (
    state: CheckInActionState,
    data: FormData,
  ) => Promise<CheckInActionState>;
  initialState?: CheckInActionState;
  storyPhoto?: { previewUrl: string; status: "loading" | "filled" | "failed" };
};

const bigButtonSx = { minHeight: designTokens.size.touchTargetMin };

function ChoiceButton({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      aria-pressed={selected}
      disabled={disabled}
      fullWidth
      onClick={onClick}
      size="large"
      sx={bigButtonSx}
      type="button"
      variant={selected ? "contained" : "outlined"}
    >
      {label}
    </Button>
  );
}

/** 提供给长辈的大号登记按钮；成功后直接回地图。 */
export function CheckInForm({ form, action, initialState, storyPhoto }: Props) {
  const router = useRouter();
  const [state, submit, isPending] = useActionState(action, initialState ?? {});
  const [plate, setPlate] = useState(form?.defaultLeasePlate ?? "");
  const [phone, setPhone] = useState("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    storyPhoto?.previewUrl ?? null,
  );
  const [recognitionStatus, setRecognitionStatus] = useState<
    "idle" | "loading" | "recognizing" | "filled" | "suggestion" | "failed"
  >(storyPhoto?.status ?? "idle");
  const [recognizedPlate, setRecognizedPlate] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const manualPlateEdited = useRef(false);
  const recognitionSerial = useRef(0);
  const photoSubmitted = useRef(false);
  const autoFilledPlate = useRef<string | null>(null);
  const recognitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const photoUrlRef = useRef<string | null>(null);
  const redirectedSession = useRef<string | null>(null);

  useEffect(() => {
    const result = state.result;
    if (!result || !form || redirectedSession.current === result.sessionId) {
      return;
    }
    redirectedSession.current = result.sessionId;
    const params = new URLSearchParams({
      done: "checkin",
      slot: form.code,
      id: result.sessionId,
    });
    // 未拍照时 photoSaved 也为 false，不能误报为照片上传失败。
    if (photoUploadFailed(photo, result.photoSaved)) params.set("photo", "0");
    router.push("/?" + params.toString());
  }, [state.result, form, photo, router]);

  useEffect(
    () => () => {
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
      setPlate(form?.defaultLeasePlate ?? "");
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
  const [billingType, setBillingType] = useState<ParkingBillingType>(
    form?.kind === "private"
      ? "hourly"
      : form?.hasLease
        ? "lease"
        : "hotel_daily",
  );
  const [days, setDays] = useState(1);
  const [customDays, setCustomDays] = useState(false);
  const [borrowMinutes, setBorrowMinutes] = useState<10 | 30 | null>(null);
  const [method, setMethod] = useState<keyof typeof paymentMethodLabels | null>(
    "wechat",
  );
  const defaultAmount = form
    ? (form.pricing.hotel_daily_price_cents / 100).toFixed(2)
    : "";
  const [amountYuan, setAmountYuan] = useState(defaultAmount);

  if (!form) {
    return (
      <Stack spacing={3}>
        <Typography variant="h2">{checkInText.missing}</Typography>
      </Stack>
    );
  }

  const isHotel = billingType === "hotel_daily";
  const isPrivate = form.kind === "private";
  const allowedBilling = checkInBillingTypeOrder.filter((value) =>
    isPrivate
      ? value === "hourly" || value === "free"
      : value !== "lease" || form.hasLease,
  );

  const setHotelDays = (nextDays: number, custom: boolean) => {
    setDays(nextDays);
    setCustomDays(custom);
    setAmountYuan(
      ((nextDays * form.pricing.hotel_daily_price_cents) / 100).toFixed(2),
    );
  };
  const validDays = Number.isInteger(days) && days >= 1 && days <= 30;
  const suggestedCents = days * form.pricing.hotel_daily_price_cents;
  const paidUntil = validDays
    ? formatBusinessDateTime(
        calculateHotelCheckoutAt(new Date(form.now), days, form.pricing),
      )
    : null;
  const normalizedPlate = normalizePlate(plate);
  const validPlate =
    normalizedPlate.length >= 2 && normalizedPlate.length <= 10;
  const normalizedPhone = phone.trim();
  const validPhone = isValidCheckInPhone(normalizedPhone);
  const hasPhoto = Boolean(photo || (storyPhoto && photoUrl));
  const validAmount =
    /^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(amountYuan) &&
    Number(amountYuan) > 0 &&
    Number(amountYuan) <= 21474836.47;
  const canSubmit =
    !isPending &&
    !isCompressing &&
    !form.occupied &&
    form.isActive &&
    (!normalizedPlate || validPlate) &&
    (!normalizedPhone || validPhone) &&
    (validPlate || validPhone || hasPhoto) &&
    (!isPrivate || borrowMinutes !== null) &&
    (!isHotel || (validDays && method !== null && validAmount));

  return (
    <>
      {state.result ? null : (
        <Stack spacing={3}>
          <Typography component="h2" variant="h2">
            {form.name}
          </Typography>
          {!form.isActive || form.occupied ? (
            <Typography color="error" variant="h3">
              {checkInText.unavailable}
            </Typography>
          ) : (
            <form
              action={(data) => {
                photoSubmitted.current = true;
                if (photo) data.set("photo", photo, "plate.jpg");
                startTransition(() => submit(data));
              }}
            >
              <Stack spacing={3}>
                {form.hasReservation && (
                  <Typography variant="body1">
                    {checkInText.hasReservation}
                  </Typography>
                )}
                <Typography>{checkInText.identityHint}</Typography>
                <input
                  accept="image/*"
                  capture="environment"
                  hidden
                  disabled={isPending}
                  onChange={(event) => {
                    void photoChosen(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                  ref={photoInput}
                  type="file"
                />
                <Button
                  disabled={isPending}
                  fullWidth
                  onClick={() => photoInput.current?.click()}
                  size="large"
                  startIcon={<CameraAltIcon />}
                  sx={bigButtonSx}
                  type="button"
                  variant="outlined"
                >
                  {checkInText.takePhoto}
                </Button>
                {photoUrl && (
                  <Stack spacing={1}>
                    <Box
                      alt={checkInText.photoPreview}
                      component="img"
                      src={photoUrl}
                      sx={{
                        borderRadius: 1,
                        maxHeight: 300,
                        objectFit: "contain",
                        width: "100%",
                      }}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button
                        disabled={isPending}
                        onClick={() => photoInput.current?.click()}
                        size="large"
                        sx={bigButtonSx}
                        type="button"
                        variant="text"
                      >
                        {checkInText.retakePhoto}
                      </Button>
                      <Button
                        disabled={isPending}
                        onClick={clearPhoto}
                        size="large"
                        sx={bigButtonSx}
                        type="button"
                        variant="text"
                      >
                        {checkInText.removePhoto}
                      </Button>
                    </Stack>
                  </Stack>
                )}
                {recognitionStatus === "loading" && (
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    <CircularProgress size={24} />
                    <Typography>{checkInText.loadingModels}</Typography>
                  </Stack>
                )}
                {recognitionStatus === "recognizing" && (
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    <CircularProgress size={24} />
                    <Typography>{checkInText.recognizing}</Typography>
                  </Stack>
                )}
                {recognitionStatus === "failed" && (
                  <Typography color="textSecondary">
                    {checkInText.recognitionFailed}
                  </Typography>
                )}
                {recognitionStatus === "filled" && (
                  <Typography color="textSecondary">
                    {checkInText.recognized}
                  </Typography>
                )}
                {recognitionStatus === "suggestion" && recognizedPlate && (
                  <Button
                    fullWidth
                    onClick={() => {
                      setPlate(recognizedPlate);
                      autoFilledPlate.current = recognizedPlate;
                      setRecognitionStatus("filled");
                    }}
                    size="large"
                    sx={bigButtonSx}
                    type="button"
                    variant="text"
                  >
                    {checkInText.recognitionSuggestion(
                      formatPlateForDisplay(recognizedPlate),
                    )}
                  </Button>
                )}
                <TextField
                  fullWidth
                  label={checkInText.plate}
                  name="plate"
                  onChange={(event) => {
                    manualPlateEdited.current =
                      normalizePlate(event.target.value).length > 0;
                    autoFilledPlate.current = null;
                    setPlate(event.target.value.toUpperCase());
                  }}
                  slotProps={{
                    htmlInput: {
                      autoCapitalize: "characters",
                      autoComplete: "off",
                    },
                  }}
                  sx={{
                    "& .MuiInputBase-root": {
                      minHeight: designTokens.size.touchTargetMin,
                    },
                    "& .MuiInputBase-input": {
                      fontSize: (theme) => theme.typography.h3.fontSize,
                    },
                  }}
                  value={plate}
                />
                <TextField
                  fullWidth
                  label={commonText.phone}
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  slotProps={{ htmlInput: { maxLength: 21 } }}
                />
                <Typography component="h3" variant="h3">
                  {checkInText.billingType}
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  }}
                >
                  {allowedBilling.map((value) => (
                    <ChoiceButton
                      key={value}
                      label={billingTypeLabels[value]}
                      onClick={() => setBillingType(value)}
                      selected={billingType === value}
                    />
                  ))}
                </Box>
                {isPrivate && (
                  <Stack spacing={2}>
                    <Typography component="h3" variant="h3">
                      {checkInText.borrowDuration}
                    </Typography>
                    <Box
                      sx={{
                        display: "grid",
                        gap: 2,
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      }}
                    >
                      {([10, 30] as const).map((minutes) => (
                        <ChoiceButton
                          key={minutes}
                          label={minutes + " " + checkInText.minuteUnit}
                          onClick={() => setBorrowMinutes(minutes)}
                          selected={borrowMinutes === minutes}
                        />
                      ))}
                    </Box>
                  </Stack>
                )}
                {isHotel && (
                  <Stack spacing={2}>
                    <Typography component="h3" variant="h3">
                      {checkInText.days}
                    </Typography>
                    <Box
                      sx={{
                        display: "grid",
                        gap: 2,
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      }}
                    >
                      {([1, 2, 3] as const).map((value) => (
                        <ChoiceButton
                          key={value}
                          label={value + " " + checkInText.dayUnit}
                          onClick={() => setHotelDays(value, false)}
                          selected={!customDays && days === value}
                        />
                      ))}
                      <ChoiceButton
                        label={checkInText.customDays}
                        onClick={() => setHotelDays(days, true)}
                        selected={customDays}
                      />
                    </Box>
                    {customDays && (
                      <TextField
                        fullWidth
                        label={checkInText.days}
                        onChange={(event) =>
                          setHotelDays(Number(event.target.value), true)
                        }
                        slotProps={{
                          htmlInput: { min: 1, max: 30, inputMode: "numeric" },
                        }}
                        type="number"
                        value={days}
                      />
                    )}
                    {paidUntil && (
                      <Typography variant="h3">
                        {checkInText.paidUntil} {paidUntil}
                      </Typography>
                    )}
                    <Typography variant="body1">
                      {checkInText.suggestedAmount}：
                      {(suggestedCents / 100).toFixed(2)} 元
                    </Typography>
                    <Typography component="h3" variant="h3">
                      {checkInText.paymentMethod}
                    </Typography>
                    <Box
                      sx={{
                        display: "grid",
                        gap: 2,
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      }}
                    >
                      {(
                        Object.keys(
                          paymentMethodLabels,
                        ) as (keyof typeof paymentMethodLabels)[]
                      ).map((value) => (
                        <ChoiceButton
                          key={value}
                          label={paymentMethodLabels[value]}
                          onClick={() => setMethod(value)}
                          selected={method === value}
                        />
                      ))}
                    </Box>
                    <TextField
                      fullWidth
                      label={checkInText.receivedAmount}
                      onChange={(event) => setAmountYuan(event.target.value)}
                      slotProps={{ htmlInput: { inputMode: "decimal" } }}
                      type="text"
                      value={amountYuan}
                    />
                  </Stack>
                )}
                <input name="slotCode" type="hidden" value={form.code} />
                <input name="billingType" type="hidden" value={billingType} />
                {isHotel && (
                  <>
                    <input name="days" type="hidden" value={days} />
                    <input
                      name="paymentMethod"
                      type="hidden"
                      value={method ?? ""}
                    />
                    <input name="amountYuan" type="hidden" value={amountYuan} />
                  </>
                )}
                {isPrivate && borrowMinutes && (
                  <input
                    name="borrowMinutes"
                    type="hidden"
                    value={borrowMinutes}
                  />
                )}
                <Button
                  disabled={!canSubmit}
                  fullWidth
                  size="large"
                  sx={{ minHeight: designTokens.size.primaryActionHeight }}
                  type="submit"
                  variant="contained"
                >
                  {isPending && (
                    <CircularProgress
                      color="inherit"
                      size={24}
                      sx={{ mr: 1 }}
                    />
                  )}
                  {isPending ? checkInText.submitting : checkInText.submit}
                </Button>
              </Stack>
            </form>
          )}
        </Stack>
      )}
      <FailureFeedbackDialog state={state} />
    </>
  );
}
