import { NextResponse } from "next/server";
import { getClearedSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", getClearedSessionCookieOptions());
  return response;
}
