"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import { designTokens } from "theme/designTokens";

type Props<T extends string | number> = {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
  columns?: number;
};

export function ChoiceButtonGroup<T extends string | number>({
  options,
  value,
  onChange,
  disabled,
  columns = options.length,
}: Props<T>) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 1,
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {options.map((option) => (
        <Button
          key={option.value}
          aria-pressed={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          type="button"
          variant={value === option.value ? "contained" : "outlined"}
          sx={{
            minHeight: designTokens.size.touchTargetMin,
            overflowWrap: "anywhere",
            minWidth: 0,
            px: 1,
            fontSize: designTokens.typography.minSize,
            lineHeight: 1.25,
            whiteSpace: "normal",
          }}
        >
          {option.label}
        </Button>
      ))}
    </Box>
  );
}
