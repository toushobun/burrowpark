"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useActionState, useRef, useState } from "react";

import { slotSettingsText } from "config/slotSettingsText";
import type { SlotSettingsRow } from "internal/parking";
import { FailureFeedbackDialog } from "molecules/feedback/FailureFeedbackDialog/FailureFeedbackDialog";
import { designTokens } from "theme/designTokens";
import type { ActionState } from "types/actions";

export type SlotSettingsChange = {
  code: string;
  name: string;
  kind: "regular" | "private";
  isActive: boolean;
  message: string;
};

type Props = {
  rows: SlotSettingsRow[];
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
};

const buttonSx = { minHeight: designTokens.size.touchTargetMin };

export function SlotSettingsList({ rows, action }: Props) {
  const triggerRef = useRef<HTMLInputElement | null>(null);
  const [change, setChange] = useState<SlotSettingsChange | null>(null);
  const [state, submit, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await action(previous, formData);
      if (result.success) {
        setChange(null);
        // Server Action 已重新验证页面，无需再次触发路由刷新。
      }
      return result;
    },
    {} as ActionState,
  );

  return (
    <>
      <Stack spacing={1} divider={<Divider flexItem />}>
        {rows.map((slot) => {
          const disabled = Boolean(slot.blockedReason);
          return (
            <Stack key={slot.code} spacing={1} sx={{ py: 1 }}>
              <Typography component="h2" variant="h3">
                {slot.name}
              </Typography>
              <Stack
                direction="row"
                spacing={2}
                sx={{ justifyContent: "space-between" }}
              >
                <FormControlLabel
                  label={slotSettingsText.private}
                  control={
                    <Switch
                      checked={slot.kind === "private"}
                      disabled={disabled}
                      slotProps={{
                        input: { "aria-label": slot.name + " 私人位" },
                      }}
                      onChange={(event) => {
                        triggerRef.current = event.target;
                        setChange({
                          code: slot.code,
                          name: slot.name,
                          kind: slot.kind === "private" ? "regular" : "private",
                          isActive: slot.isActive,
                          message:
                            slot.kind === "private"
                              ? slotSettingsText.setRegular(slot.name)
                              : slotSettingsText.setPrivate(slot.name),
                        });
                      }}
                    />
                  }
                  sx={{ minHeight: designTokens.size.touchTargetMin }}
                />
                <FormControlLabel
                  label={slotSettingsText.active}
                  control={
                    <Switch
                      checked={slot.isActive}
                      disabled={disabled}
                      slotProps={{
                        input: { "aria-label": slot.name + " 启用" },
                      }}
                      onChange={(event) => {
                        triggerRef.current = event.target;
                        setChange({
                          code: slot.code,
                          name: slot.name,
                          kind: slot.kind,
                          isActive: !slot.isActive,
                          message: slot.isActive
                            ? slotSettingsText.disable(slot.name)
                            : slotSettingsText.enable(slot.name),
                        });
                      }}
                    />
                  }
                  sx={{ minHeight: designTokens.size.touchTargetMin }}
                />
              </Stack>
              {slot.blockedReason && (
                <Typography variant="body1" color="textSecondary">
                  {slotSettingsText.blockedReasons[slot.blockedReason]}
                </Typography>
              )}
            </Stack>
          );
        })}
      </Stack>
      <Dialog
        open={Boolean(change)}
        fullWidth
        onClose={() => setChange(null)}
        disableRestoreFocus
        slotProps={{
          transition: {
            onExited: () => {
              if (!change) {
                // 恢复开关焦点时不触发浏览器自动滚动。
                triggerRef.current?.focus({ preventScroll: true });
                triggerRef.current = null;
              }
            },
          },
        }}
      >
        <DialogTitle>{change?.message}</DialogTitle>
        <form action={submit}>
          <DialogContent>
            <input type="hidden" name="code" value={change?.code ?? ""} />
            <input
              type="hidden"
              name="kind"
              value={change?.kind ?? "regular"}
            />
            <input
              type="hidden"
              name="isActive"
              value={String(change?.isActive ?? true)}
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setChange(null)}
              disabled={pending}
              sx={buttonSx}
            >
              {slotSettingsText.cancel}
            </Button>
            <Button type="submit" disabled={pending} sx={buttonSx}>
              {slotSettingsText.confirm}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <FailureFeedbackDialog state={state} />
    </>
  );
}
