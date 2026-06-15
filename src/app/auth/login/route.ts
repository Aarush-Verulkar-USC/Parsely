import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { signToken, verifyPassword } from "@/lib/auth";
import { error, jsonWithSession } from "@/lib/http";
import { credentialsSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = credentialsSchema.safeParse(body);
  if (!parsed.success) {
    return error("Invalid email or password", 401);
  }

  const { email, password } = parsed.data;

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return error("Invalid email or password", 401);
  }

  const token = await signToken({ userId: user.id, email: user.email });
  return jsonWithSession(
    { user: { id: user.id, email: user.email }, token },
    token,
  );
}
