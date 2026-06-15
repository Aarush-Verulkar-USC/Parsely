import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/session";

const maxAgeSeconds = Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES ?? 1440) * 60;

export function jsonWithSession(
  body: unknown,
  token: string,
  status = 200,
): NextResponse {
  const res = NextResponse.json(body, { status });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
  return res;
}

export function error(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
