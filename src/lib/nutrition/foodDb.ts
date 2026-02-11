export type Macro = { kcal: number; protein_g: number; carbs_g: number; fat_g: number };

function stripAccents(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function norm(s: string) {
  return stripAccents((s ?? "").toLowerCase().trim());
}

export type FoodMeta = { name: string; keys: string[]; per100g: Macro; min_g: number; max_g: number };

export const FOOD_DB: FoodMeta[] = [
  // proteínas
  { name: "Peito de Frango", keys: ["frango", "peito de frango"], per100g: { kcal: 165, protein_g: 31, carbs_g: 0, fat_g: 4 }, min_g: 100, max_g: 300 },
  { name: "Peru", keys: ["peru"], per100g: { kcal: 135, protein_g: 29, carbs_g: 0, fat_g: 1.5 }, min_g: 100, max_g: 300 },
  { name: "Atum (lata ao natural)", keys: ["atum"], per100g: { kcal: 116, protein_g: 26, carbs_g: 0, fat_g: 1 }, min_g: 80, max_g: 250 },
  { name: "Salmão", keys: ["salmao", "salmão"], per100g: { kcal: 208, protein_g: 20, carbs_g: 0, fat_g: 13 }, min_g: 100, max_g: 250 },
  { name: "Carne de Vaca", keys: ["vaca", "carne de vaca"], per100g: { kcal: 217, protein_g: 26, carbs_g: 0, fat_g: 12 }, min_g: 100, max_g: 300 },
  { name: "Carne de Porco", keys: ["porco", "carne de porco"], per100g: { kcal: 242, protein_g: 27, carbs_g: 0, fat_g: 14 }, min_g: 100, max_g: 300 },
  { name: "Ovos", keys: ["ovo", "ovos"], per100g: { kcal: 143, protein_g: 13, carbs_g: 1, fat_g: 10 }, min_g: 80, max_g: 320 },

  { name: "Iogurte Natural", keys: ["iogurte"], per100g: { kcal: 61, protein_g: 4, carbs_g: 5, fat_g: 3 }, min_g: 125, max_g: 500 },
  { name: "Queijo Fresco", keys: ["queijo fresco"], per100g: { kcal: 90, protein_g: 10, carbs_g: 3, fat_g: 4 }, min_g: 80, max_g: 250 },
  { name: "Leite", keys: ["leite"], per100g: { kcal: 42, protein_g: 3.4, carbs_g: 5, fat_g: 1 }, min_g: 200, max_g: 800 },

  // carbs (assume cozinhado para arroz/massa)
  { name: "Arroz", keys: ["arroz"], per100g: { kcal: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3 }, min_g: 120, max_g: 450 },
  { name: "Massa", keys: ["massa"], per100g: { kcal: 158, protein_g: 5.8, carbs_g: 31, fat_g: 0.9 }, min_g: 120, max_g: 450 },
  { name: "Batata", keys: ["batata"], per100g: { kcal: 87, protein_g: 2, carbs_g: 20, fat_g: 0.1 }, min_g: 150, max_g: 600 },
  { name: "Batata Doce", keys: ["batata doce"], per100g: { kcal: 90, protein_g: 2, carbs_g: 21, fat_g: 0.2 }, min_g: 150, max_g: 600 },
  { name: "Pão Integral", keys: ["pao integral", "pão integral"], per100g: { kcal: 250, protein_g: 13, carbs_g: 41, fat_g: 4 }, min_g: 60, max_g: 220 },
  { name: "Pão", keys: ["pao", "pão"], per100g: { kcal: 265, protein_g: 9, carbs_g: 49, fat_g: 3.2 }, min_g: 60, max_g: 250 },
  { name: "Aveia", keys: ["aveia"], per100g: { kcal: 389, protein_g: 17, carbs_g: 66, fat_g: 7 }, min_g: 40, max_g: 140 },

  // fruta
  { name: "Banana", keys: ["banana"], per100g: { kcal: 89, protein_g: 1.1, carbs_g: 23, fat_g: 0.3 }, min_g: 80, max_g: 300 },
  { name: "Maçã", keys: ["maca", "maçã"], per100g: { kcal: 52, protein_g: 0.3, carbs_g: 14, fat_g: 0.2 }, min_g: 120, max_g: 350 },

  // vegetais
  { name: "Cenoura", keys: ["cenoura"], per100g: { kcal: 41, protein_g: 0.9, carbs_g: 10, fat_g: 0.2 }, min_g: 100, max_g: 350 },
  { name: "Brócolos", keys: ["brocolo", "brócolo", "brocolos", "brócolos"], per100g: { kcal: 35, protein_g: 2.8, carbs_g: 7, fat_g: 0.4 }, min_g: 100, max_g: 350 },
  { name: "Alface/Salada", keys: ["alface", "salada"], per100g: { kcal: 15, protein_g: 1.4, carbs_g: 2.9, fat_g: 0.2 }, min_g: 100, max_g: 400 },

  // gorduras
  { name: "Azeite", keys: ["azeite"], per100g: { kcal: 884, protein_g: 0, carbs_g: 0, fat_g: 100 }, min_g: 5, max_g: 25 },
  { name: "Nozes", keys: ["noz", "nozes"], per100g: { kcal: 654, protein_g: 15, carbs_g: 14, fat_g: 65 }, min_g: 10, max_g: 70 },
  { name: "Amêndoas", keys: ["amendoa", "amêndoa", "amendoas", "amêndoas"], per100g: { kcal: 579, protein_g: 21, carbs_g: 22, fat_g: 50 }, min_g: 10, max_g: 70 },
  { name: "Manteiga de Amendoim", keys: ["manteiga de amendoim"], per100g: { kcal: 588, protein_g: 25, carbs_g: 20, fat_g: 50 }, min_g: 10, max_g: 40 },
  { name: "Abacate", keys: ["abacate"], per100g: { kcal: 160, protein_g: 2, carbs_g: 9, fat_g: 15 }, min_g: 50, max_g: 250 },
];

export function findFoodMeta(food: string): FoodMeta | null {
  const f = norm(food);
  for (const meta of FOOD_DB) {
    if (meta.keys.some((k) => f.includes(norm(k)))) return meta;
  }
  return null;
}
