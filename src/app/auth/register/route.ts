import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, signToken } from "@/lib/auth";
import { error, jsonWithSession } from "@/lib/http";
import { credentialsSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = credentialsSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const { email, password } = parsed.data;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  if (existing.length > 0) {
    return error("An account with that email already exists", 409);
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash })
    .returning({ id: users.id, email: users.email });

  const token = await signToken({ userId: user.id, email: user.email });
  return jsonWithSession({ user, token }, token, 201);
}
