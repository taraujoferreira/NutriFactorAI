import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/session";
import { calcTargets } from "@/lib/nutrition/calc";
import { PlanSchema } from "@/lib/nutrition/planSchema";

import { chatCompletion } from "@/lib/llm/client";
import { buildPlanPrompt } from "@/lib/nutrition/prompt";
import { validatePlanFoods } from "@/lib/nutrition/guardrails";
import { autoFixCalories } from "@/lib/nutrition/autofix";

const Body = z.object({
  sex: z.enum(["male", "female"]),
  age: z.number().int().min(16).max(90),
  heightCm: z.number().int().min(130).max(230),
  weightKg: z.number().min(35).max(250),
  activity: z.enum(["sedentary", "light", "moderate", "high", "athlete"]),
  goal: z.enum(["lose", "maintain", "gain"]),
  mealsPerDay: z.number().int().min(3).max(6),
  dislikes: z.array(z.string()).optional().default([]),
  allergies: z.array(z.string()).optional().default([]),
});

export async function POST(req: Request) {
  const userId = await getUserIdFromCookie();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = Body.parse(await req.json());

  // 1) Targets controlados no backend
  const targets = calcTargets({
    sex: body.sex,
    age: body.age,
    heightCm: body.heightCm,
    weightKg: body.weightKg,
    activity: body.activity,
    goal: body.goal,
  });

  // 2) Prompt (system + user)
  const { system, user } = buildPlanPrompt({
    sex: body.sex,
    age: body.age,
    heightCm: body.heightCm,
    weightKg: body.weightKg,
    activity: body.activity,
    goal: body.goal,
    mealsPerDay: body.mealsPerDay,
    dislikes: body.dislikes ?? [],
    allergies: body.allergies ?? [],
    targets: {
      calories_kcal: targets.calories_kcal,
      protein_g: targets.protein_g,
      carbs_g: targets.carbs_g,
      fat_g: targets.fat_g,
    },
  });

  // helper: gerar + parse JSON + validar schema
  async function generatePlanFromLLM(extraUserInstruction?: string) {
    const raw = await chatCompletion(
      [
        { role: "system", content: system },
        {
          role: "user",
          content: extraUserInstruction ? `${user}\n\n${extraUserInstruction}` : user,
        },
      ],
      { temperature: extraUserInstruction ? 0.2 : 0.4 }
    );

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const txt = raw.trim();
      const start = txt.indexOf("{");
      const end = txt.lastIndexOf("}");
      if (start >= 0 && end > start) parsed = JSON.parse(txt.slice(start, end + 1));
      else throw new Error("LLM não devolveu JSON válido.");
    }

    return PlanSchema.parse(parsed);
  }

  // 3) Tentar gerar até 3 vezes (1 + 2 correções)
  let plan = await generatePlanFromLLM();
  let check = validatePlanFoods(plan);

  for (let attempt = 1; !check.ok && attempt <= 2; attempt++) {
    const extra = `
O plano anterior foi rejeitado.
Corrige o plano respeitando ESTRITAMENTE os alimentos permitidos e removendo itens inválidos.

Problemas encontrados:
${check.problems.map((p) => `- ${p}`).join("\n")}

REGRAS PRO:
- Pequeno-almoço: proteína + carb + fruta
- Almoço: proteína + carb + vegetais + gordura (azeite/nozes)
- Lanche: proteína (iogurte/queijo) + (carb opcional)
- Jantar: proteína + carb + vegetais + gordura

IMPORTANTE:
- Se o total de kcal estiver baixo, aumenta carbs (arroz/massa/batata/aveia/pão) e adiciona azeite (10g almoço + 10g jantar).

Devolve APENAS JSON válido (sem texto fora do JSON).
`;

    plan = await generatePlanFromLLM(extra);
    check = validatePlanFoods(plan);
  }

  // 4) Auto-fix de calorias (PRO): corrige quantidades para bater target
  const fixed = autoFixCalories(plan);
  plan = fixed.plan;

  // revalidar após auto-fix
  check = validatePlanFoods(plan);

  if (!check.ok) {
    return NextResponse.json(
      { error: "O plano gerado não passou validação de alimentos.", details: check.problems, meta: check.meta },
      { status: 502 }
    );
  }

  // 5) Guardrail final: targets do backend mandam
  plan.targets = {
    calories_kcal: targets.calories_kcal,
    protein_g: targets.protein_g,
    carbs_g: targets.carbs_g,
    fat_g: targets.fat_g,
  };
  plan.meals_per_day = body.mealsPerDay;

  // 6) Arquivar plano ativo anterior
  await prisma.nutritionPlan.updateMany({
    where: { userId, status: "active" },
    data: { status: "archived" },
  });

  // 7) Guardar novo plano
  const saved = await prisma.nutritionPlan.create({
    data: { userId, status: "active", planJson: plan },
  });

  return NextResponse.json({ ok: true, planId: saved.id, fixed });
}
