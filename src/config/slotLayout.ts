import { z } from "zod";

import rawLayout from "./slotLayout.json";

const rectSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  w: z.number().positive(),
  h: z.number().positive(),
});

const pointSchema = z.tuple([z.number().finite(), z.number().finite()]);

export const slotLayoutSchema = z
  .object({
    version: z.literal(1),
    unit: z.string(),
    width: z.number().positive(),
    height: z.number().positive(),
    slots: z.array(rectSchema.extend({ code: z.string() }).strict()),
    obstacles: z.array(
      rectSchema
        .extend({
          kind: z.enum(["cage", "tree", "building"]),
          label: z.string(),
        })
        .strict(),
    ),
    walls: z.array(z.array(pointSchema).min(2)),
    entrance: rectSchema.strict(),
    areas: z.array(
      z
        .object({
          label: z.string(),
          x: z.number().finite(),
          y: z.number().finite(),
        })
        .strict(),
    ),
  })
  .strict();

export const slotLayouts = z
  .object({ outer: slotLayoutSchema, inner: slotLayoutSchema })
  .strict()
  .parse(rawLayout);

export type Yard = keyof typeof slotLayouts;

export function getSlotYard(code: string | undefined): Yard {
  return slotLayouts.inner.slots.some((slot) => slot.code === code)
    ? "inner"
    : "outer";
}
