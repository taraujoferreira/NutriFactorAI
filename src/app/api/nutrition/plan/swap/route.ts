import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/session";
import { PlanSchema } from "@/lib/nutrition/planSchema";
import { getSwapOptions } from "@/lib/nutrition/swaps";
import { adjustQuantityOnSwap } from "@/lib/nutrition/swapAdjust";

const Body = z.object({
  mealIndex: z.number().int().min(0).max(20),
  itemIndex: z.number().int().min(0).max(20),
  newFood: z.string().min(1),
});

export async function POST(req: Request) {
  const userId = await getUserIdFromCookie();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = Body.parse(await req.json());

  const active = await prisma.nutritionPlan.findFirst({
    where: { userId, status: "active" },
    orderBy: { createdAt: "desc" },
    select: { id: true, planJson: true },
  });

  if (!active?.planJson) {
    return NextResponse.json({ error: "No active plan" }, { status: 404 });
  }

  const plan = PlanSchema.parse(active.planJson);

  const meal = plan.meals?.[body.mealIndex];
  if (!meal) return NextResponse.json({ error: "Meal not found" }, { status: 400 });

  const item = meal.items?.[body.itemIndex];
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 400 });

  // valida se o newFood é um swap plausível para aquele item
    const opts = getSwapOptions(item.food);
    const allowed = opts.options.map((x) => x.toLowerCase());
    if (allowed.length && !allowed.includes(body.newFood.toLowerCase())) {
    return NextResponse.json({ error: "Invalid swap option" }, { status: 400 });
    }


const it: any = meal.items[body.itemIndex];

const baseQty = it.base_quantity_g; // agora existe SEMPRE
const oldFood = it.food;

const cat = getSwapOptions(oldFood).category;
const mode =
  cat === "protein" ? "protein" :
  cat === "fat" ? "fat" :
  cat === "carb" ? "kcal" :
  "kcal";

it.food = body.newFood;
it.quantity_g = adjustQuantityOnSwap({
  oldFood,
  oldQty_g: baseQty,
  newFood: body.newFood,
  mode,
});

  // guardar (mantém status active, atualiza json)
  await prisma.nutritionPlan.update({
    where: { id: active.id },
    data: { planJson: plan },
  });

  return NextResponse.json({ ok: true, planId: active.id, plan });
}
