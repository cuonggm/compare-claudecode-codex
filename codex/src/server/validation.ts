import { z } from "zod";
import { clayBodies, firingTypes, glazeFamilies, targetCones } from "../shared/domain.js";

const isoDate = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Ngày phải hợp lệ.");

export const pieceInputSchema = z.object({
  ownerId: z.number().int().positive(),
  name: z.string().trim().min(1).max(120),
  clayBody: z.enum(clayBodies),
  glazeFamily: z.enum(glazeFamilies),
  targetCone: z.enum(targetCones),
  firingType: z.enum(firingTypes),
  widthCm: z.number().positive(),
  depthCm: z.number().positive(),
  heightCm: z.number().positive(),
  weightKg: z.number().positive(),
  drynessPercent: z.number().min(0).max(100),
  dueDate: isoDate,
  notes: z.string().max(1000).default("")
});

export const planLoadSchema = z.object({
  kilnId: z.number().int().positive(),
  targetCone: z.enum(targetCones),
  firingType: z.enum(firingTypes),
  dueDatePriority: z.boolean().optional()
});

export const expectedVersionSchema = z.object({
  expectedVersion: z.number().int().positive()
});

export const scheduleSchema = expectedVersionSchema.extend({
  scheduledStart: isoDate,
  scheduledEnd: isoDate
}).refine((value) => Date.parse(value.scheduledEnd) > Date.parse(value.scheduledStart), {
  message: "Thời điểm kết thúc phải sau thời điểm bắt đầu."
});

export const noteSchema = expectedVersionSchema.extend({
  note: z.string().trim().min(1).max(1000)
});

export const csvImportSchema = z.object({
  csv: z.string().min(1).max(100_000)
});
