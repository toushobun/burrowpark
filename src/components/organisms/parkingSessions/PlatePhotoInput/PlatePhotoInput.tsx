"use client";

import CameraAltIcon from "@mui/icons-material/CameraAlt";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRef } from "react";

import { platePhotoText } from "config/platePhotoText";
import { formatPlateForDisplay } from "internal/parking";
import { designTokens } from "theme/designTokens";

import type { usePlatePhotoInput } from "./usePlatePhotoInput";

type Props = {
  capture: ReturnType<typeof usePlatePhotoInput>;
  label: string;
  purpose: "checkin" | "lease";
  disabled: boolean;
};

const bigButtonSx = { minHeight: designTokens.size.touchTargetMin };

export function PlatePhotoInput({ capture, label, purpose, disabled }: Props) {
  const photoInput = useRef<HTMLInputElement>(null);
  const {
    plate,
    photoUrl,
    recognitionStatus,
    recognizedPlate,
    photoChosen,
    clearPhoto,
    changePlate,
    applySuggestion,
  } = capture;

  return (
    <>
      <input
        accept="image/*"
        capture="environment"
        hidden
        disabled={disabled}
        onChange={(event) => {
          void photoChosen(event.target.files?.[0]);
          event.target.value = "";
        }}
        ref={photoInput}
        type="file"
      />
      <Button
        disabled={disabled}
        fullWidth
        onClick={() => photoInput.current?.click()}
        size="large"
        startIcon={<CameraAltIcon />}
        sx={bigButtonSx}
        type="button"
        variant="outlined"
      >
        {platePhotoText.takePhoto}
      </Button>
      {photoUrl && (
        <Stack spacing={1}>
          <Box
            alt={platePhotoText.photoPreview}
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
              disabled={disabled}
              onClick={() => photoInput.current?.click()}
              size="large"
              sx={bigButtonSx}
              type="button"
              variant="text"
            >
              {platePhotoText.retakePhoto}
            </Button>
            <Button
              disabled={disabled}
              onClick={clearPhoto}
              size="large"
              sx={bigButtonSx}
              type="button"
              variant="text"
            >
              {platePhotoText.removePhoto}
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
          <Typography>{platePhotoText.loadingModels[purpose]}</Typography>
        </Stack>
      )}
      {recognitionStatus === "recognizing" && (
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center" }}
        >
          <CircularProgress size={24} />
          <Typography>{platePhotoText.recognizing}</Typography>
        </Stack>
      )}
      {recognitionStatus === "failed" && (
        <Typography color="textSecondary">
          {platePhotoText.recognitionFailed[purpose]}
        </Typography>
      )}
      {recognitionStatus === "filled" && (
        <Typography color="textSecondary">
          {platePhotoText.recognized}
        </Typography>
      )}
      {recognitionStatus === "suggestion" && recognizedPlate && (
        <Button
          fullWidth
          onClick={applySuggestion}
          size="large"
          sx={bigButtonSx}
          type="button"
          variant="text"
        >
          {platePhotoText.recognitionSuggestion(
            formatPlateForDisplay(recognizedPlate),
          )}
        </Button>
      )}
      <TextField
        fullWidth
        label={label}
        name="plate"
        disabled={disabled}
        onChange={(event) => changePlate(event.target.value)}
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
    </>
  );
}
