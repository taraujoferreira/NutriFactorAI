type Plan = {
  meals: { items: { food: string; quantity_g: number }[] }[];
};

type Category =
  | "Proteínas"
  | "Carboidratos"
  | "Gorduras"
  | "Vegetais"
  | "Fruta"
  | "Outros";

function stripAccents(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function norm(s: string) {
  return stripAccents((s ?? "").toLowerCase().trim());
}

function categorize(food: string): Category {
  const f = norm(food);

  if (f.includes("banana") || f.includes("maca")) return "Fruta";

  if (
    f.includes("brocol") ||
    f.includes("espinafr") ||
    f.includes("alface") ||
    f.includes("salada") ||
    f.includes("tomate") ||
    f.includes("cenoura") ||
    f.includes("pepino") ||
    f.includes("courgette") ||
    f.includes("pimento") ||
    f.includes("cebola")
  ) return "Vegetais";

  if (
    f.includes("azeite") ||
    f.includes("noz") ||
    f.includes("amendoa") ||
    f.includes("abacate") ||
    f.includes("manteiga de amendoim")
  ) return "Gorduras";

  if (
    f.includes("arroz") ||
    f.includes("massa") ||
    f.includes("batata") ||
    f.includes("pao") ||
    f.includes("aveia") ||
    f.includes("wrap") ||
    f.includes("tortilha")
  ) return "Carboidratos";

  if (
    f.includes("ovo") ||
    f.includes("frango") ||
    f.includes("peru") ||
    f.includes("atum") ||
    f.includes("salmao") ||
    f.includes("vaca") ||
    f.includes("porco") ||
    f.includes("iogurte") ||
    f.includes("queijo") ||
    f.includes("leite") ||
    f.includes("whey")
  ) return "Proteínas";

  return "Outros";
}

function canonicalName(food: string) {
  const clean = (food ?? "").trim();
  return clean.length ? clean : "Item";
}

// --- UNIDADES “QUE FAZEM SENTIDO” ---
function formatQty(food: string, grams: number) {
  const f = norm(food);
  const g = Math.round(grams);

  // 1) kg para quantidades grandes
  if (g >= 1000 && (f.includes("arroz") || f.includes("massa") || f.includes("batata") || f.includes("carne") || f.includes("frango") || f.includes("peru") || f.includes("legume") || f.includes("salada") || f.includes("brocol") || f.includes("cenoura"))) {
    const kg = Math.round((g / 1000) * 10) / 10; // 1 casa decimal
    return { qty: kg, unit: "kg" as const };
  }

  // 2) azeite -> ml (densidade ~0.91 g/ml)
  if (f.includes("azeite")) {
    const ml = Math.round(g / 0.91);
    return { qty: ml, unit: "ml" as const };
  }

  // 3) leite -> ml (aprox 1g ~ 1ml)
  if (f.includes("leite")) {
    return { qty: g, unit: "ml" as const };
  }

  // 4) ovos -> unidades (1 ovo ~ 60g)
  if (f.includes("ovo")) {
    const units = Math.max(1, Math.round(g / 60));
    return { qty: units, unit: "unid" as const };
  }

  // 5) fruta -> unidades aproximadas
  if (f.includes("banana")) {
    const units = Math.max(1, Math.round(g / 120)); // 1 banana ~120g
    return { qty: units, unit: "unid" as const };
  }
  if (f.includes("maca")) {
    const units = Math.max(1, Math.round(g / 180)); // 1 maçã ~180g
    return { qty: units, unit: "unid" as const };
  }

  // default: gramas
  return { qty: g, unit: "g" as const };
}

export function buildShoppingList(plan: Plan) {
  const map = new Map<
    string,
    { name: string; grams: number; category: Category }
  >();

  for (const meal of plan.meals ?? []) {
    for (const it of meal.items ?? []) {
      const name = canonicalName(it.food);
      const key = norm(name);
      const grams = Math.round(Number(it.quantity_g ?? 0));
      if (!name || !grams || grams <= 0) continue;

      const category = categorize(name);
      const prev = map.get(key);
      if (prev) prev.grams += grams;
      else map.set(key, { name, grams, category });
    }
  }

  const items = Array.from(map.values()).sort((a, b) =>
    a.category === b.category ? a.name.localeCompare(b.name) : a.category.localeCompare(b.category)
  );

  const grouped: Record<Category, { name: string; grams: number; qty: number; unit: string }[]> = {
    "Proteínas": [],
    "Carboidratos": [],
    "Gorduras": [],
    "Vegetais": [],
    "Fruta": [],
    "Outros": [],
  };

  for (const it of items) {
    const { qty, unit } = formatQty(it.name, it.grams);
    grouped[it.category].push({ name: it.name, grams: it.grams, qty, unit });
  }

  const text = (Object.keys(grouped) as Category[])
    .filter((cat) => grouped[cat].length)
    .map((cat) => {
      const lines = grouped[cat]
        .map((x) => `- ${x.name} — ${x.qty}${x.unit}`)
        .join("\n");
      return `${cat}\n${lines}`;
    })
    .join("\n\n");

  return { items, grouped, text };
}
