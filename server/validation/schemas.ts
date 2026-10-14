import { z } from "zod";

const optionalText = z.string().trim().max(300).optional();

export const notebookInput = z.object({
  title: z.string().trim().min(1, "Title is required.").max(80),
  subject: z.string().trim().max(60).optional(),
  description: optionalText,
});

export const profileInput = z.object({
  displayName: z.string().trim().min(1, "Name is required.").max(60),
  email: z.email("Enter a valid email address."),
});

export const messageInput = z.object({
  content: z.string().trim().min(1, "Message is required.").max(2000),
  notebookId: z.string().trim().min(1).optional(),
});

export const tutorInput = z.object({
  topic: z.string().trim().min(1, "Topic is required.").max(120),
  notebookId: z.string().trim().min(1).optional(),
});

export const assessmentInput = z.object({
  title: z.string().trim().min(1, "Title is required.").max(100),
  notebookId: z.string().trim().min(1).optional(),
});

export const attemptInput = z.object({
  answers: z.record(z.string(), z.number().int().min(0)),
});
