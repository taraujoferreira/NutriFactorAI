function stripAccents(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function norm(s: string) {
  return stripAccents((s ?? "").toLowerCase().trim());
}

export type SwapCategory = "protein" | "carb" | "veg" | "fat" | "other";

function categoryOf(food: string): SwapCategory {
  const f = norm(food);

  if (
    f.includes("frango") || f.includes("peru") || f.includes("atum") || f.includes("salmao") ||
    f.includes("vaca") || f.includes("porco") || f.includes("ovo") || f.includes("iogurte") || f.includes("queijo") ||
    f.includes("leite") || f.includes("whey")
  ) return "protein";

  if (
    f.includes("arroz") || f.includes("massa") || f.includes("batata") || f.includes("pao") ||
    f.includes("aveia") || f.includes("wrap") || f.includes("tortilha") || f.includes("banana") || f.includes("maca")
  ) return "carb";

  if (
    f.includes("brocol") || f.includes("cenoura") || f.includes("tomate") || f.includes("alface") ||
    f.includes("salada") || f.includes("espinafr") || f.includes("pepino") || f.includes("courgette") ||
    f.includes("pimento") || f.includes("cebola")
  ) return "veg";

  if (
    f.includes("azeite") || f.includes("noz") || f.includes("amendoa") || f.includes("abacate") ||
    f.includes("manteiga de amendoim")
  ) return "fat";

  return "other";
}

const SWAPS: Record<Exclude<SwapCategory, "other">, string[]> = {
  protein: ["Peito de Frango", "Peru", "Atum (lata ao natural)", "Carne de Vaca", "Carne de Porco", "Salmão", "Ovos", "Iogurte Natural", "Queijo Fresco", "Leite"],
  carb: ["Arroz", "Massa", "Batata", "Batata Doce", "Pão Integral", "Pão", "Aveia", "Banana", "Maçã", "Wrap/Tortilha"],
  veg: ["Brócolos", "Cenoura", "Tomate", "Alface", "Salada", "Espinafres", "Pepino", "Courgette", "Pimentos", "Cebola"],
  fat: ["Azeite", "Nozes", "Amêndoas", "Manteiga de Amendoim", "Abacate"],
};

// keyword “base” para saber se uma opção é “o mesmo alimento”
function baseKey(option: string) {
  const o = norm(option);
  if (o.includes("frango")) return "frango";
  if (o.includes("peru")) return "peru";
  if (o.includes("atum")) return "atum";
  if (o.includes("salmao")) return "salmao";
  if (o.includes("vaca")) return "vaca";
  if (o.includes("porco")) return "porco";
  if (o.includes("ovo")) return "ovo";
  if (o.includes("iogurte")) return "iogurte";
  if (o.includes("queijo")) return "queijo";
  if (o.includes("leite")) return "leite";

  if (o.includes("arroz")) return "arroz";
  if (o.includes("massa")) return "massa";
  if (o.includes("batata doce")) return "batata doce";
  if (o.includes("batata")) return "batata";
  if (o.includes("pao integral")) return "pao integral";
  if (o.includes("pao")) return "pao";
  if (o.includes("aveia")) return "aveia";
  if (o.includes("banana")) return "banana";
  if (o.includes("maca")) return "maca";
  if (o.includes("wrap") || o.includes("tortilha")) return "wrap";

  if (o.includes("brocol")) return "brocol";
  if (o.includes("cenoura")) return "cenoura";
  if (o.includes("tomate")) return "tomate";
  if (o.includes("alface")) return "alface";
  if (o.includes("salada")) return "salada";
  if (o.includes("espinafr")) return "espinafr";
  if (o.includes("pepino")) return "pepino";
  if (o.includes("courgette")) return "courgette";
  if (o.includes("pimento")) return "pimento";
  if (o.includes("cebola")) return "cebola";

  if (o.includes("azeite")) return "azeite";
  if (o.includes("noz")) return "noz";
  if (o.includes("amendoa")) return "amendoa";
  if (o.includes("manteiga de amendoim")) return "manteiga de amendoim";
  if (o.includes("abacate")) return "abacate";

  return o;
}

export function getSwapOptions(food: string) {
  const cat = categoryOf(food);
  if (cat === "other") return { category: cat, options: [] as string[] };

  const f = norm(food);

  // remove opções cujo “baseKey” já aparece no food (ex: "frango grelhado" remove "Peito de Frango")
  const options = SWAPS[cat].filter((opt) => !f.includes(baseKey(opt)));

  return { category: cat, options };
}
