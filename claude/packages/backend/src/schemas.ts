// Zod schemas for request validation. Keeps server-side validation distinct
// from client-side validation — the backend never trusts the client.

import { z } from 'zod';
import {
  CLAY_BODIES,
  FIRING_TYPES,
  GLAZE_FAMILIES,
  TARGET_CONES,
} from '@kilnflow/shared';

export const pieceInputSchema = z.object({
  ownerId: z.string().min(1),
  name: z.string().min(1).max(120),
  clayBody: z.enum(CLAY_BODIES as [string, ...string[]]),
  glazeFamily: z.enum(GLAZE_FAMILIES as [string, ...string[]]),
  targetCone: z.enum(TARGET_CONES as [string, ...string[]]),
  firingType: z.enum(FIRING_TYPES as [string, ...string[]]),
  widthCm: z.number().positive().max(200),
  depthCm: z.number().positive().max(200),
  heightCm: z.number().positive().max(200),
  weightKg: z.number().positive().max(200),
  drynessPercent: z.number().min(0).max(100),
  dueDate: z
    .string()
    .refine((s) => !Number.isNaN(new Date(s).getTime()), 'Invalid dueDate'),
  notes: z.string().max(2000).default(''),
  status: z
    .enum(['draft', 'ready', 'blocked', 'in-load', 'fired', 'cancelled'])
    .default('ready'),
});

export const planRequestSchema = z.object({
  kilnId: z.string().min(1),
  targetCone: z.enum(TARGET_CONES as [string, ...string[]]),
  firingType: z.enum(FIRING_TYPES as [string, ...string[]]),
  candidatePieceIds: z.array(z.string()).optional(),
  prioritizeDueDate: z.boolean().optional(),
});

export const loadActionSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
});

export const scheduleSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  scheduledAt: z
    .string()
    .refine((s) => !Number.isNaN(new Date(s).getTime()), 'Invalid scheduledAt'),
});

export const noteSchema = z.object({
  body: z.string().min(1).max(2000),
});

export const csvImportSchema = z.object({
  csv: z.string().min(1).max(200000),
});
