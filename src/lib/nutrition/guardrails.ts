import type { NutritionPlanJson } from "./planSchema";

const FORBIDDEN_WORDS = [
  "algodao",
  "bola de algodao",
  "sabao",
  "detergente",
  "plastico",
  "papel",
  "shampoo",
  "desinfetante",
  "bacalhau",
];

const ALLOWED_KEYWORDS = [
  // proteínas
  "ovo", "ovos",
  "frango", "peru", "atum", "salmao",
  "vaca", "porco",
  "iogurte", "queijo", "leite", "whey",

  // carbs
  "arroz", "massa", "batata", "pao", "aveia", "banana", "maca", "wrap", "tortilha",

  // gorduras
  "azeite", "amendoa", "amendoas", "noz", "nozes", "abacate", "manteiga de amendoim",

  // vegetais
  "alface", "tomate", "cenoura", "brocolo", "brocolos", "espinafre", "espinafres",
  "courgette", "pepino", "pimento", "pimentos", "cebola",
];

const VEGGIE_KEYWORDS = [
  "alface", "tomate", "cenoura", "brocolo", "brocolos", "espinafre", "espinafres",
  "courgette", "pepino", "pimento", "pimentos", "cebola",
];

const CARB_KEYWORDS = ["arroz", "massa", "batata", "pao", "aveia", "banana", "maca", "wrap", "tortilha"];

const FAT_KEYWORDS = ["azeite", "amendoa", "amendoas", "noz", "nozes", "abacate", "manteiga de amendoim"];

const FRUIT_KEYWORDS = ["banana", "maca"];

function stripAccents(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function norm(s: string) {
  return stripAccents((s ?? "").toLowerCase().trim());
}

function isEgg(food: string) {
  return food.includes("ovo");
}
function isVeggie(food: string) {
  return VEGGIE_KEYWORDS.some((k) => food.includes(k));
}
function isCarb(food: string) {
  return CARB_KEYWORDS.some((k) => food.includes(k));
}
function isFat(food: string) {
  return FAT_KEYWORDS.some((k) => food.includes(k));
}
function isFruit(food: string) {
  return FRUIT_KEYWORDS.some((k) => food.includes(k));
}
function isProtein(food: string) {
  return (
    food.includes("ovo") ||
    food.includes("frango") ||
    food.includes("peru") ||
    food.includes("atum") ||
    food.includes("salmao") ||
    food.includes("vaca") ||
    food.includes("porco") ||
    food.includes("iogurte") ||
    food.includes("queijo") ||
    food.includes("leite") ||
    food.includes("whey")
  );
}


export function validatePlanFoods(plan: NutritionPlanJson) {
  const problems: string[] = [];

  // =========================
  // 0) sanity kcal total
  // =========================
  const totalKcal = plan.meals.reduce((acc, m) => acc + (m.estimated_macros?.kcal ?? 0), 0);
  const target = plan.targets.calories_kcal;
  const minOk = Math.round(target * 0.9);
  const maxOk = Math.round(target * 1.1);

  if (totalKcal < minOk || totalKcal > maxOk) {
    problems.push(
      `Kcal total fora do intervalo: ${totalKcal} kcal (target ${target}, esperado ${minOk}-${maxOk}).`
    );
  }

  // =========================
  // 1) contadores do dia (PRO)
  // =========================
  let fruitCount = 0;
  let veggieCount = 0;
  let fatCount = 0;
  let totalItems = 0;
  let mainMealsWithCarbs = 0;

  // =========================
  // 2) validar por refeição
  // =========================
  for (const meal of plan.meals) {
    const mealName = meal.name ?? "Refeição";

    const isMain = /^(almoç|almoc|jantar)/i.test(mealName.trim());

    // proteína mínima em refeições principais
    if (isMain) {
      const p = meal.estimated_macros?.protein_g ?? 0;
      if (p < 35) problems.push(`Proteína baixa no ${mealName}: ${p}g (mínimo 35g).`);
    }

    // contar carbs em refeições principais
    if (isMain) {
      const hasCarb = meal.items.some((it) => isCarb(norm(it.food)));
      if (hasCarb) mainMealsWithCarbs++;
    }

    // PRO: refeições principais devem ter vegetais
    if (isMain) {
      const hasVeg = meal.items.some((it) => isVeggie(norm(it.food)));
      if (!hasVeg) problems.push(`${mealName} sem vegetais (deve ter pelo menos 1 vegetal).`);
    }

    for (const item of meal.items) {
      totalItems++;
      const food = norm(item.food);

      // contadores diários
      if (isFruit(food)) fruitCount++;
      if (isVeggie(food)) veggieCount++;
      if (isFat(food)) fatCount++;

      // 1) proibidos
      for (const bad of FORBIDDEN_WORDS) {
        if (food.includes(bad)) {
          problems.push(`Item proibido: "${item.food}"`);
          break;
        }
      }

      if (!food) {
        problems.push(`Item vazio numa refeição ("food" está vazio).`);
        continue;
        }


      // 2) whitelist
      const ok = ALLOWED_KEYWORDS.some((k) => food.includes(k));
      if (!ok) problems.push(`Item fora da lista de alimentos comuns: "${item.food}"`);

      // 3) ovos em gramas
      if (isEgg(food) && item.quantity_g < 60) {
        problems.push(`Quantidade de ovos inválida: "${item.food}" com ${item.quantity_g}g (usa ex: 120g).`);
      }

      // 4) mínimos de vegetais
      if (isVeggie(food) && item.quantity_g < 100) {
        problems.push(`Vegetais muito baixos: "${item.food}" com ${item.quantity_g}g (mínimo 100g).`);
      }

      // 5) mínimos de carbs
    if (isCarb(food)) {
    // mínimos mais realistas por alimento
    const min =
        food.includes("banana") || food.includes("maçã") ? 80 :
        food.includes("pao") ? 80 :
        food.includes("batata doce") ? 90 :
        food.includes("batata") ? 100 :
        food.includes("arroz") || food.includes("massa") ? 100 :
        food.includes("aveia") ? 40 :
        80;

    if (item.quantity_g < min) {
        problems.push(`Carboidrato muito baixo: "${item.food}" com ${item.quantity_g}g (mínimo ${min}g).`);
    }
    }


      // 6) sanity proteína em alimentos proteicos
      if (isProtein(food) && item.quantity_g < 80) {
        problems.push(`Proteína muito baixa: "${item.food}" com ${item.quantity_g}g (mínimo 80g).`);
      }
    }
  }

  // =========================
  // 3) regras PRO do dia
  // =========================
  if (totalItems < 8) problems.push(`Plano muito curto: só ${totalItems} itens no dia (mínimo 8).`);

  if (fruitCount < 1) problems.push("Falta fruta (mínimo 1 por dia).");

  if (veggieCount < 2) problems.push("Poucos vegetais no dia (mínimo 2 itens de vegetais).");

  if (fatCount < 1) problems.push("Falta uma gordura boa (azeite/nozes/abacate/manteiga de amendoim).");

  if (mainMealsWithCarbs < 2) problems.push("Almoço e Jantar devem ter carboidratos.");

  return {
    ok: problems.length === 0,
    problems,
    meta: {
      totalKcal,
      targetKcal: target,
      expectedRange: [minOk, maxOk] as const,
      fruitCount,
      veggieCount,
      fatCount,
      totalItems,
      mainMealsWithCarbs,
    },
  };
}
