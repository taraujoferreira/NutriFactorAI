import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/session";

export async function GET() {
  const userId = await getUserIdFromCookie();
  if (!userId) return NextResponse.json({ user: null });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  return NextResponse.json({ user });
}
