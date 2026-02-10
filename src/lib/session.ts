import { cookies } from "next/headers";
import { verifySession } from "./auth";

const COOKIE_NAME = "session";

export async function setSessionCookie(token: string) {
  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export async function getUserIdFromCookie() {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    return await verifySession(token);
  } catch {
    return null;
  }
}
