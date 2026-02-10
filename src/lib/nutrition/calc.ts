export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "high" | "athlete";
export type Goal = "lose" | "maintain" | "gain";

const ACTIVITY: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  athlete: 1.9,
};

export function calcBmrMifflin(sex: Sex, age: number, heightCm: number, weightKg: number) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function calcTargets(input: {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: Goal;
}) {
  const bmr = calcBmrMifflin(input.sex, input.age, input.heightCm, input.weightKg);
  const tdee = bmr * ACTIVITY[input.activity];

  const calorieDelta =
    input.goal === "lose" ? -350 :
    input.goal === "gain" ? +300 :
    0;

  const calories = Math.round(tdee + calorieDelta);

  const proteinPerKg = input.goal === "gain" ? 2.0 : 1.8;
  const proteinG = Math.round(proteinPerKg * input.weightKg);

  const fatG = Math.round(0.8 * input.weightKg);

  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;

  const carbsKcal = Math.max(0, calories - proteinKcal - fatKcal);
  const carbsG = Math.round(carbsKcal / 4);

  return {
    calories_kcal: calories,
    protein_g: proteinG,
    carbs_g: carbsG,
    fat_g: fatG,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
  };
}
