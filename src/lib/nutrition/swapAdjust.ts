import { findFoodMeta } from "./foodDb";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function roundStep(n: number, step: number) {
  return Math.round(n / step) * step;
}

export function adjustQuantityOnSwap(params: {
  oldFood: string;
  oldQty_g: number;
  newFood: string;
  mode?: "protein" | "carb" | "fat" | "kcal";
}) {
  const oldMeta = findFoodMeta(params.oldFood);
  const newMeta = findFoodMeta(params.newFood);

  if (!oldMeta || !newMeta) return Math.round(params.oldQty_g);

  const mode = params.mode ?? "protein";

  const oldPer100 = oldMeta.per100g;
  const newPer100 = newMeta.per100g;

  const oldQty = params.oldQty_g;

  const oldProtein = (oldQty / 100) * oldPer100.protein_g;
  const oldCarbs = (oldQty / 100) * oldPer100.carbs_g;
  const oldFat = (oldQty / 100) * oldPer100.fat_g;
  const oldKcal = (oldQty / 100) * oldPer100.kcal;

  let rawNewQty = oldQty;

  if (mode === "protein") {
    if (newPer100.protein_g > 0.1) rawNewQty = (oldProtein / newPer100.protein_g) * 100;
  } else if (mode === "carb") {
    if (newPer100.carbs_g > 0.1) rawNewQty = (oldCarbs / newPer100.carbs_g) * 100;
  } else if (mode === "fat") {
    if (newPer100.fat_g > 0.1) rawNewQty = (oldFat / newPer100.fat_g) * 100;
  } else if (mode === "kcal") {
    if (newPer100.kcal > 1) rawNewQty = (oldKcal / newPer100.kcal) * 100;
  }

  // ✅ 1) CAP anti-“drift”: limita variação por swap
  // carbs (kcal) pode variar um bocado, proteína menos
  const maxFactor =
    mode === "kcal" ? 1.6 :
    mode === "carb" ? 1.7 :
    mode === "fat" ? 1.5 :
    1.4;

  const minFactor =
    mode === "kcal" ? 0.6 :
    mode === "carb" ? 0.6 :
    mode === "fat" ? 0.5 :
    0.7;

  rawNewQty = clamp(rawNewQty, oldQty * minFactor, oldQty * maxFactor);

  // ✅ 2) Clamp por alimento (min/max realistas)
  rawNewQty = clamp(rawNewQty, newMeta.min_g, newMeta.max_g);

  // ✅ 3) Arredondamento “humano” (evita 258g)
  // heurística: azeite/nozes/amêndoas em passos pequenos, carbs em 10/25g, proteína em 10g
  const newName = (newMeta.name ?? "").toLowerCase();

  let step = 10; // default
  if (newName.includes("azeite")) step = 5;
  else if (newName.includes("noz") || newName.includes("amendo") || newName.includes("manteiga")) step = 5;
  else if (newName.includes("arroz") || newName.includes("massa") || newName.includes("batata")) step = 25;
  else if (newName.includes("pao") || newName.includes("aveia")) step = 10;

  const rounded = roundStep(rawNewQty, step);

  // re-clamp final depois de arredondar
  return clamp(Math.round(rounded), newMeta.min_g, newMeta.max_g);
}
