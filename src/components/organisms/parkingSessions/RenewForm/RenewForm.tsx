"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useActionState, useState } from "react";

import { renewText, parkingOperationText } from "config/renewAndCheckOutText";
import type { RenewFormData } from "internal/parking";
import {
  extendHotelPaidUntil,
  formatBusinessDate,
  formatBusinessDateTime,
  leaseDateToPaidUntil,
} from "internal/parking";
import type { RenewActionState } from "internal/parking/adapter/next/renewActions";
import { FailureFeedbackDialog } from "molecules/feedback/FailureFeedbackDialog/FailureFeedbackDialog";
import { designTokens } from "theme/designTokens";
import type { ActionState } from "types/actions";
import {
  ParkingOperationResult,
  PaymentAmountField,
  PaymentMethodChoices,
  validYuanAmount,
  type PaymentMethod,
} from "../PaymentOperationParts";

type Props = {
  form: RenewFormData | null;
  action: (
    state: RenewActionState,
    data: FormData,
  ) => Promise<RenewActionState>;
  undoAction: (state: ActionState, data: FormData) => Promise<Actio