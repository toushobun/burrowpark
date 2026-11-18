import { z } from "zod";

import { ValidationError } from "internal/shared/errors/appError";

import { authMessages } from "./errors";

const accessCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6,12}$/);

export function parseAccessCode(value: FormDataEntryValue | null): string {
  const result = accessCodeSchema.safeParse(value);
  if (!result.success) {
    throw new ValidationError("invalid_access_code", authMessages.invalidCode);
  }
  return result.data;
}
