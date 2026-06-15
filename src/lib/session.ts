import { cookies } from "next/headers";

import { type SessionPayload, verifyToken } from "@/lib/auth";

export const SESSION_COOKIE = "parsely_token";

export async function getCurrentUser(
  request?: Request,
): Promise<SessionPayload | null> {
  let token: string | undefined;

  const header = request?.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    token = header.slice("Bearer ".length);
  }

  if (!token) {
    const store = await cookies();
    token = store.get(SESSION_COOKIE)?.value;
  }

  if (!token) return null;
  return verifyToken(token);
}

export async function requireUser(request?: Request): Promise<SessionPayload> {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return user;
}
