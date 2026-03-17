import { z } from 'zod';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_TYPES = ['application/vnd.ms-pki.stl'];

export const createOrderSchema = z.object({
  clientName: z.string().min(2, { message: "Name must be at least 2 characters long." }),
  clientPhone: z.string().min(10, { message: "Please enter a valid phone number." }),
  notes: z.string().optional(),
  quantity: z.coerce.number().int().min(1, { message: "Quantity must be at least 1." }).default(1),
  stlUrl: z.string().url({ message: "Please enter a valid URL." }).optional(),
  stlFile: z.any()
    // .refine((file) => file?.size <= MAX_FILE_SIZE, `Max file size is 50MB.`)
    // .refine(
    //   (file) => ALLOWED_FILE_TYPES.includes(file?.type),
    //   "Only .stl files are accepted."
    // )
    .optional(),
}).refine(data => data.stlUrl || data.stlFile, {
  message: "Either a file upload or a URL is required.",
  path: ["stlFile"], // Attach error to a specific field
});

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
