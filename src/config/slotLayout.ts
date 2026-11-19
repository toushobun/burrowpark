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
    sealedOpening: z.tuple([pointSchema, pointSchema]),
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

export const slotLayout = slotLayoutSchema.parse(rawLayout);
