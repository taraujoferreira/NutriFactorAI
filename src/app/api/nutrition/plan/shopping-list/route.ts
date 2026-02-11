import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/session";
import { buildShoppingList } from "@/lib/nutrition/shoppingList";

export async function GET() {
  const userId = await getUserIdFromCookie();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const active = await prisma.nutritionPlan.findFirst({
    where: { userId, status: "active" },
    orderBy: { createdAt: "desc" },
    select: { id: true, planJson: true },
  });

  if (!active?.planJson) {
    return NextResponse.json({ error: "No active plan" }, { status: 404 });
  }

  const plan = active.planJson as any; // JSON vindo da BD
  const list = buildShoppingList(plan);

  return NextResponse.json({ ok: true, planId: active.id, ...list });
}
