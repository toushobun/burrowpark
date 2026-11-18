"use client";

import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useActionState, useRef, useState } from "react";

import { FailureFeedbackDialog } from "molecules/feedback/FailureFeedbackDialog/FailureFeedbackDialog";
import { authMessages } from "internal/auth";
import { designTokens } from "theme/designTokens";
import type { ActionState } from "types/actions";

type AccessCodeLoginFormProps = {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
};

export function AccessCodeLoginForm({ action }: AccessCodeLoginFormProps) {
  const [state, submit, isPending] = useActionState(action, {});
  const [code, setCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function dismissError() {
    setCode("");
    // 关闭 Dialog 的焦点陷阱后，将输入焦点交还给访问码输入框。
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <>
      <form action={submit}>
        <Stack spacing={3}>
          <TextField
            autoComplete="off"
            fullWidth
            inputRef={inputRef}
            label={authMessages.accessCodeLabel}
            name="accessCode"
            onChange={(event) => setCode(event.target.value)}
            slotProps={{ htmlInput: { inputMode: "numeric", autoComplete: "off" } }}
            sx={{
              "& .MuiInputBase-root": {
                minHeight: designTokens.size.touchTargetMin,
              },
              "& .MuiInputBase-input": {
                fontSize: (theme) => theme.typography.h3.fontSize,
              },
            }}
            type="text"
            value={code}
          />
          <Button
            disabled={isPending || code.trim().length === 0}
            fullWidth
            size="large"
            type="submit"
            variant="contained"
          >
            {isPending && <CircularProgress aria-label="提交中" color="inherit" size={24} sx={{ mr: 1 }} />}
            {authMessages.submit}
          </Button>
        </Stack>
      </form>
      <FailureFeedbackDialog onClose={dismissError} state={state} />
    </>
  );
}
