import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redis } from "@/lib/redis";
import {
  createSessionToken,
  getSessionCookieName,
  getSessionMaxAge,
  getUserKey,
  hashPassword,
  normalizeUserId,
  type StoredUser,
} from "@/lib/auth";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    userId?: string;
    password?: string;
  };

  const userId = normalizeUserId(body.userId || "");
  const password = body.password?.trim() || "";

  if (userId.length < 3 || password.length < 4) {
    return NextResponse.json(
      { error: "Username must be 3+ chars and password must be 4+ chars." },
      { status: 400 }
    );
  }

  const userKey = getUserKey(userId);
  const existingUser = await redis.get<StoredUser>(userKey);

  if (existingUser) {
    return NextResponse.json(
      { error: "Username already exists." },
      { status: 409 }
    );
  }

  const user: StoredUser = {
    userId,
    passwordHash: hashPassword(password),
    createdAt: Date.now(),
  };

  await redis.set(userKey, user);

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
