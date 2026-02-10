import type { NutritionPlanJson } from "./planSchema";

function norm(s: string) {
  return (s ?? "").toLowerCase();
}

function approxKcal(food: string, g: number) {
  const f = norm(food);

  // aproximações simples (kcal por 100g)
  if (f.includes("azeite")) return (g * 9); // ~9 kcal por g
  if (f.includes("noz") || f.includes("amendoa") || f.includes("amêndoa")) return Math.round(g * 6); // ~600/100g
  if (f.includes("manteiga de amendoim")) return Math.round(g * 6);
  if (f.includes("aveia")) return Math.round(g * 3.8); // 380/100g
  if (f.includes("pao") || f.includes("pão")) return Math.round(g * 2.5);
  if (f.includes("arroz") || f.includes("massa")) return Math.round(g * 1.3); // cozido ~130/100g
  if (f.includes("batata")) return Math.round(g * 0.8);
  if (f.includes("banana")) return Math.round(g * 0.9);
  if (f.includes("maca") || f.includes("maçã")) return Math.round(g * 0.5);

  // proteínas
  if (f.includes("frango") || f.includes("peru")) return Math.round(g * 1.65);
  if (f.includes("vaca") || f.includes("porco")) return Math.round(g * 2.0);
  if (f.includes("atum")) return Math.round(g * 1.3);
  if (f.includes("salmao") || f.includes("salmão")) return Math.round(g * 2.0);
  if (f.includes("ovo")) return Math.round(g * 1.55);
  if (f.includes("iogurte")) return Math.round(g * 0.7);
  if (f.includes("queijo")) return Math.round(g * 2.0);

  // vegetais default
  return Math.round(g * 0.3);
}

function recomputeMealKcal(meal: NutritionPlanJson["meals"][number]) {
  const kcal = meal.items.reduce((acc, it) => acc + approxKcal(it.food, it.quantity_g), 0);
  // não mexemos nos macros aqui — só kcal para validação/progressão
  meal.estimated_macros.kcal = kcal;
  return kcal;
}

function ensureVeggies(meal: NutritionPlanJson["meals"][number], grams: number) {
  const hasVeg =
    meal.items.some((it) => {
      const f = norm(it.food);
      return (
        f.includes("brocolo") || f.includes("brocol") ||
        f.includes("espinafre") ||
        f.includes("alface") ||
        f.includes("salada") ||
        f.includes("tomate") ||
        f.includes("cenoura") ||
        f.includes("pepino") ||
        f.includes("courgette") ||
        f.includes("pimento") ||
        f.includes("cebola")
      );
    });

  if (!hasVeg) {
    meal.items.push({ food: "Brócolos", quantity_g: grams, notes: "" });
  }
}


export function autoFixCalories(plan: NutritionPlanJson) {
  const target = plan.targets.calories_kcal;

  const totalKcal = plan.meals.reduce((acc, m) => acc + (m.estimated_macros?.kcal ?? 0), 0);
  if (totalKcal >= Math.round(target * 0.9)) return { plan, changed: false, before: totalKcal, after: totalKcal };

  // Helpers para encontrar refeições
  const breakfast = plan.meals.find(m => /pequeno|cafe|café/i.test(m.name)) ?? plan.meals[0];
  const lunch = plan.meals.find(m => /almo/i.test(m.name)) ?? plan.meals[Math.min(1, plan.meals.length - 1)];
  const dinner = plan.meals.find(m => /jantar/i.test(m.name)) ?? plan.meals[plan.meals.length - 1];

  // 1) garantir azeite no almoço e jantar (10g cada)
  function ensureOliveOil(meal: typeof lunch, grams: number) {
    const idx = meal.items.findIndex(it => norm(it.food).includes("azeite"));
    if (idx >= 0) {
      meal.items[idx].quantity_g = Math.max(meal.items[idx].quantity_g, grams);
    } else {
      meal.items.push({ food: "Azeite", quantity_g: grams, notes: "" });
    }
  }
  ensureOliveOil(lunch, 10);
  ensureOliveOil(dinner, 10);
  ensureVeggies(lunch, 200);
  ensureVeggies(dinner, 200);


  // 2) aumentar carbs em almoço/jantar para 250-350g (cozido)
  function bumpMainCarb(meal: typeof lunch, minG: number) {
    const carbIdx = meal.items.findIndex(it => {
      const f = norm(it.food);
      return f.includes("arroz") || f.includes("massa") || f.includes("batata");
    });
    if (carbIdx >= 0) {
      meal.items[carbIdx].quantity_g = Math.max(meal.items[carbIdx].quantity_g, minG);
    } else {
      // se não tiver carb, adiciona arroz
      meal.items.push({ food: "Arroz", quantity_g: minG, notes: "cozido" });
    }
  }
  bumpMainCarb(lunch, 300);
  bumpMainCarb(dinner, 250);

  // 3) garantir aveia 60g no pequeno-almoço
  const oatIdx = breakfast.items.findIndex(it => norm(it.food).includes("aveia"));
  if (oatIdx >= 0) breakfast.items[oatIdx].quantity_g = Math.max(breakfast.items[oatIdx].quantity_g, 60);
  else breakfast.items.push({ food: "Aveia", quantity_g: 60, notes: "" });

  // 4) recomputar kcal por refeição de forma aproximada
  let after = 0;
  for (const m of plan.meals) after += recomputeMealKcal(m);

  // 5) ajustar meal_distribution para bater target (simples: proporcional)
  const sumDist = plan.meal_distribution.reduce((a, x) => a + x.kcal, 0) || 1;
  plan.meal_distribution = plan.meal_distribution.map((x) => ({
    ...x,
    kcal: Math.round((x.kcal / sumDist) * target),
  }));

  return { plan, changed: true, before: totalKcal, after };
}
