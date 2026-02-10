import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, signSession } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const body = Body.parse(await req.json());

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });

  const ok = await verifyPassword(body.password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });

  const token = await signSession(user.id);
  await setSessionCookie(token);

  return NextResponse.json({ ok: true });
}
