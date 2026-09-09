import { z } from 'zod';

export const createOrderSchema = z.object({
  clientName: z.string().min(2, { message: "Name must be at least 2 characters long." }),
  clientPhone: z.string().min(10, { message: "Please enter a valid phone number." }),
  notes: z.string().optional(),
  quantity: z.coerce.number().int().min(1, { message: "Quantity must be at least 1." }).default(1),
  stlUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  stlFile: z.any().optional(),
});

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
