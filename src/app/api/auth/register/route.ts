import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, signSession } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const body = Body.parse(await req.json());

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) return NextResponse.json({ error: "Email já existe" }, { status: 409 });

  const user = await prisma.user.create({
    data: { email: body.email, passwordHash: await hashPassword(body.password) },
  });

  const token = await signSession(user.id);
  await setSessionCookie(token);

  return NextResponse.json({ ok: true });
}
