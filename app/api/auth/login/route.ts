import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redis } from "@/lib/redis";
import {
  createSessionToken,
  getSessionCookieName,
  getSessionMaxAge,
  getUserKey,
  normalizeUserId,
  verifyPassword,
  type StoredUser,
} from "@/lib/auth";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    userId?: string;
    password?: string;
  };

  const userId = normalizeUserId(body.userId || "");
  const password = body.password?.trim() || "";

  if (!userId || !password) {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 }
    );
  }

  const user = await redis.get<StoredUser>(getUserKey(userId));

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 }
    );
  }

  const sessionToken = createSessionToken(userId);
  const cookieStore = await cookies();
  cookieStore.set(getSessionCookieName(), sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getSessionMaxAge(),
  });

  return NextResponse.json({ ok: true, userId });
}
