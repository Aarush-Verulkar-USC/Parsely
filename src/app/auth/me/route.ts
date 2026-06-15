import { getCurrentUser } from "@/lib/session";
import { error } from "@/lib/http";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return error("Unauthorized", 401);
  return NextResponse.json({ user });
}
