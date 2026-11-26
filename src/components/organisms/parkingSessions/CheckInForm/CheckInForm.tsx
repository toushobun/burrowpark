"use client";

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
  isValidCheckInPhone,
  normalizePlate,
} from "internal/parking";
import type { CheckInActionState } from "internal/parking/adapter/next/checkInActions";
import { NoticeBox } from "molecules/display/NoticeBox/NoticeBox";
import { ChoiceButtonGroup } from "molecules/forms/ChoiceButtonGroup/ChoiceButtonGroup";
import { FailureFeedbackDialog } from "molecules/feedback/FailureFeedbackDialog/FailureFeedbackDialog";
import { useSlotOperationPending } from "organisms/slots/SlotOperationDialog/slotOperationDialogContext";
import { designTokens } from "theme/designTokens";

import { PlatePhotoInput } from "../PlatePhotoInput/PlatePhotoInput";
import {
  usePlatePhotoInput,
  type PlatePhotoStory,
} from "../PlatePhotoInput/usePlatePhotoInput";
import { PaymentMethodChoices } from "../PaymentOperationParts";
import { photoUploadFailed } from "./photoUploadStatus";

type Props = {
  form: CheckInFormData | null;
  action: (
    state: CheckInActionState,
    data: FormData,
  ) => Promise<CheckInActionState>;
  initialState?: CheckInActionState;
  storyPhoto?: PlatePhotoStory;
};

/** 提供给长辈的大号登记按钮；成功后直接回地图。 */
export function CheckInForm({ form, action, initialState, storyPhoto }: Props) {
  const router = useRouter();
  const [state, submit, isPending] = useActionState(action, initialState ?? {});
  const dialog = useSlotOperationPending(isPending);
  const capture = usePlatePhotoInput(form?.defaultLeasePlate ?? "", storyPhoto);
  const { plate, photo, photoUrl, isCompressing, markSubmitted } = capture;
  const [phone, setPhone] = useState("");
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
    dialog?.complete?.();
    if (dialog) router.replace("/?" + params.toString());
    else router.push("/?" + params.toString());
  }, [state.result, form, photo, router, dialog]);

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
          <Stack spacing={0.5}>
            <Typography component="h2" variant="h2">
              {form.name}
            </Typography>
            {form.isActive && !form.occupied && (
              <Typography variant="body2" color="textSecondary">
                {checkInText.identityHint}
              </Typography>
            )}
          </Stack>
          {!form.isActive || form.occupied ? (
            <Typography color="error" variant="h3">
              {checkInText.unavailable}
            </Typography>
          ) : (
            <form
              action={(data) => {
                markSubmitted();
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
                <Stack spacing={1.5}>
                  <PlatePhotoInput
                    capture={capture}
                    disabled={isPending}
                    label={checkInText.plate}
                    purpose="checkin"
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
                </Stack>
                <Stack spacing={1.5}>
                  <Typography component="h3" variant="h6">
                    {checkInText.billingType}
                  </Typography>
                  <ChoiceButtonGroup
                    options={allowedBilling.map((value) => ({
                      value,
                      label: billingTypeLabels[value],
                    }))}
                    value={billingType}
                    onChange={setBillingType}
                    columns={
                      allowedBilling.length === 4 ? 2 : allowedBilling.length
                    }
                  />
                </Stack>
                {isPrivate && (
                  <Stack spacing={1.5}>
                    <Typography component="h3" variant="h6">
                      {checkInText.borrowDuration}
                    </Typography>
                    <ChoiceButtonGroup<10 | 30>
                      options={([10, 30] as const).map((value) => ({
                        value,
                        label: value + " " + checkInText.minuteUnit,
                      }))}
                      value={borrowMinutes}
                      onChange={setBorrowMinutes}
                    />
                  </Stack>
                )}
                {isHotel && (
                  <>
                    <Stack spacing={1.5}>
                      <Typography component="h3" variant="h6">
                        {checkInText.days}
                      </Typography>
                      <ChoiceButtonGroup
                        options={[1, 2, 3, 0].map((value) => ({
                          value,
                          label: value
                            ? value + " " + checkInText.dayUnit
                            : checkInText.customDays,
                        }))}
                        value={customDays ? 0 : days}
                        onChange={(value) =>
                          setHotelDays(value || days, value === 0)
                        }
                      />
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
                      <NoticeBox
                        title={paidUntil && checkInText.paidUntil + " " + paidUntil}
                      >
                        {checkInText.suggestedAmount}：
                        {(suggestedCents / 100).toFixed(2)} 元
                      </NoticeBox>
                    </Stack>
                    <Stack spacing={1.5}>
                      <Typography component="h3" variant="h6">
                        {checkInText.paymentMethod}
                      </Typography>
                      <PaymentMethodChoices
                        value={method}
                        onChange={setMethod}
                        disabled={isPending}
                      />
                      <TextField
                        fullWidth
                        label={checkInText.receivedAmount}
                        onChange={(event) => setAmountYuan(event.target.value)}
                        slotProps={{ htmlInput: { inputMode: "decimal" } }}
                        type="text"
                        value={amountYuan}
                      />
                    </Stack>
                  </>
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
