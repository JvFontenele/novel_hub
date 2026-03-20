import { z } from 'zod';

export const createNovelSchema = z.object({
  sourceUrl: z.string().url(),
  displayName: z.string().min(1).max(255),
});

export const updateProgressSchema = z.object({
  lastReadChapterNumber: z.number().positive(),
});

export type CreateNovelInput = z.infer<typeof createNovelSchema>;
export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
