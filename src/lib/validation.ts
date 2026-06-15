import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type Credentials = z.infer<typeof credentialsSchema>;
