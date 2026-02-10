import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/session";

export async function GET() {
  const userId = await getUserIdFromCookie();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = await prisma.nutritionPlan.findFirst({
    where: { userId, status: "active" },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ plan: plan?.planJson ?? null });
}
