import { z } from "zod";

const IntLike = z
  .number()
  .finite()
  .transform((n) => Math.round(n));

export const PlanSchema = z.object({
  version: z.string(),
  locale: z.string().default("pt-PT"),
  targets: z.object({
    calories_kcal: IntLike,
    protein_g: IntLike,
    carbs_g: IntLike,
    fat_g: IntLike,
  }),
  meals_per_day: z.number().int().min(3).max(6),
  meal_distribution: z.array(
    z.object({
      meal: z.string(),
      kcal: IntLike,
    })
  ),
  meals: z.array(
    z.object({
      name: z.string(),
      items: z.array(
        z.object({
          food: z.string(),
          quantity_g: IntLike,
          notes: z.string().optional().default(""),
        })
      ),
      estimated_macros: z.object({
        kcal: IntLike,
        protein_g: IntLike,
        carbs_g: IntLike,
        fat_g: IntLike,
      }),
    })
  ),
  swap_options: z
    .array(
      z.object({
        swap: z.string(),
        options: z.array(
          z.object({
            from: z.string(),
            to: z.string(),
            ratio: z.string(),
          })
        ),
      })
    )
    .default([]),
  rules: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

export type NutritionPlanJson = z.infer<typeof PlanSchema>;
