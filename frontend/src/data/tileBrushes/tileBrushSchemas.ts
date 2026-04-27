import { z } from "zod";

export const tileBrushCellSchema = z.object({
  tileValue: z.number().int(),
  enabled: z.boolean(),
});

export const tileBrushSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    game: z.union([
      z.literal("bugdom1"),
      z.literal("nanosaur1"),
      z.literal("mightymike"),
    ]),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    cells: z.array(tileBrushCellSchema),
  })
  .superRefine((brush, context) => {
    if (brush.cells.length !== brush.width * brush.height) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cells"],
        message: "cells length must match width * height",
      });
    }
  });

export const tileBrushDocumentSchema = z.object({
  version: z.literal(1),
  brushes: z.array(tileBrushSchema),
});

export type TileBrushDocument = z.infer<typeof tileBrushDocumentSchema>;
