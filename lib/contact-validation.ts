import { z } from 'zod';
export const requestStatuses = ['new', 'in_progress', 'resolved', 'archived'] as const;
export const statusLabels = {
  new: 'New',
  in_progress: 'In progress',
  resolved: 'Resolved',
  archived: 'Archived',
};
export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter at least 2 characters.').max(100),
  email: z
    .email('Enter a valid email address.')
    .max(254)
    .transform((v) => v.toLowerCase()),
  subject: z.string().trim().min(3, 'Enter at least 3 characters.').max(160),
  message: z.string().trim().min(10, 'Please include at least 10 characters.').max(5000),
});
export const requestUpdateSchema = z.object({
  id: z.uuid(),
  revision: z.string().min(1).max(64),
  status: z.enum(requestStatuses),
  note: z.string().trim().max(2000),
});
