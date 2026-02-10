"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Plan = {
  version: string;
  locale: string;
  targets: { calories_kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  meals_per_day: number;
  meal_distribution: { meal: string; kcal: number }[];
  meals: {
    name: string;
    items: { food: string; quantity_g: number; notes?: string }[];
    estimated_macros: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  }[];
  rules: string[];
  warnings: string[];
};

function clamp(n: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, n));
}

function Progress({ value }: { value: number }) {
  // value 0..1
  const pct = Math.round(clamp(value) * 100);
  return (
    <div className="h-2 w-full rounded-full bg-black/10 overflow-hidden">
      <div className="h-full rounded-full bg-black/60" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs bg-white ${className ?? ""}`}>
      {children}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-xs text-black/60">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

export default function PlanPage() {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/nutrition/plan/active", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? "Falha ao carregar plano.");
        setPlan(data?.plan ?? data?.planJson ?? null);
      } catch (e: any) {
        setError(e?.message ?? "Erro inesperado");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totals = useMemo(() => {
    if (!plan) return null;
    const sum = plan.meals.reduce(
      (acc, m) => {
        acc.kcal += m.estimated_macros?.kcal ?? 0;
        acc.protein_g += m.estimated_macros?.protein_g ?? 0;
        acc.carbs_g += m.estimated_macros?.carbs_g ?? 0;
        acc.fat_g += m.estimated_macros?.fat_g ?? 0;
        return acc;
      },
      { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );
    return sum;
  }, [plan]);

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-50 p-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="h-10 w-56 rounded-2xl bg-black/10 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-black/10 animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-black/10 animate-pulse" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-neutral-50 p-6">
        <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-6">
          <h1 className="text-xl font-semibold">Plano</h1>
          <p className="mt-2 text-sm text-black/70">{error}</p>
          <div className="mt-4 flex gap-2">
            <Link className="rounded-xl border px-4 py-2 text-sm" href="/chat">
              Gerar plano
            </Link>
            <Link className="rounded-xl border px-4 py-2 text-sm" href="/">
              Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!plan || !totals) {
    return (
      <main className="min-h-screen bg-neutral-50 p-6">
        <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-6">
          <h1 className="text-xl font-semibold">Ainda não tens plano ativo</h1>
          <p className="mt-2 text-sm text-black/70">Gera um plano no chat e ele aparece aqui.</p>
          <div className="mt-4">
            <Link className="rounded-xl border px-4 py-2 text-sm" href="/chat">
              Ir ao chat
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const kcalPct = totals.kcal / plan.targets.calories_kcal;
  const pPct = totals.protein_g / plan.targets.protein_g;
  const cPct = totals.carbs_g / plan.targets.carbs_g;
  const fPct = totals.fat_g / plan.targets.fat_g;

  return (
    <main className="min-h-screen bg-neutral-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">O teu plano</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip>{plan.meals_per_day} refeições</Chip>
              <Chip>pt-PT</Chip>
              <Chip className="hidden">{plan.version}</Chip>
            </div>
          </div>

          <div className="flex gap-2">
            <Link className="rounded-xl border bg-white px-4 py-2 text-sm" href="/chat">
              Ajustar no chat
            </Link>
          </div>
        </header>

        {/* Targets + progress */}
        <section className="rounded-2xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-black/80">Targets diários</h2>
            <span className="text-xs text-black/60">
              estimado: {totals.kcal} / {plan.targets.calories_kcal} kcal
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Calorias" value={`${plan.targets.calories_kcal} kcal`} />
            <Stat label="Proteína" value={`${plan.targets.protein_g} g`} />
            <Stat label="Carbs" value={`${plan.targets.carbs_g} g`} />
            <Stat label="Gordura" value={`${plan.targets.fat_g} g`} />
          </div>

          <div className="mt-5 grid gap-4">
            <div>
              <div className="flex items-center justify-between text-xs text-black/70">
                <span>Calorias</span>
                <span>{Math.round(clamp(kcalPct) * 100)}%</span>
              </div>
              <Progress value={kcalPct} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between text-xs text-black/70">
                  <span>Proteína</span>
                  <span>{Math.round(clamp(pPct) * 100)}%</span>
                </div>
                <Progress value={pPct} />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs text-black/70">
                  <span>Carbs</span>
                  <span>{Math.round(clamp(cPct) * 100)}%</span>
                </div>
                <Progress value={cPct} />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs text-black/70">
                  <span>Gordura</span>
                  <span>{Math.round(clamp(fPct) * 100)}%</span>
                </div>
                <Progress value={fPct} />
              </div>
            </div>
          </div>
        </section>

        {/* Meals */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-black/80">Refeições</h2>
            <div className="text-xs text-black/60">
              total estimado: {totals.kcal} kcal
            </div>
          </div>

          <div className="grid gap-4">
            {plan.meals.map((meal, idx) => (
              <div key={idx} className="rounded-2xl border bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold">{meal.name}</div>
                    <div className="mt-1 text-xs text-black/60">
                      {meal.estimated_macros.kcal} kcal · P {meal.estimated_macros.protein_g}g · C {meal.estimated_macros.carbs_g}g · G {meal.estimated_macros.fat_g}g
                    </div>
                  </div>
                  <Chip>{idx + 1}/{plan.meals.length}</Chip>
                </div>

                <div className="mt-4 space-y-2">
                  {meal.items.map((it, j) => (
                    <div key={j} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm">{it.food}</div>
                        {it.notes ? <div className="text-xs text-black/60">{it.notes}</div> : null}
                      </div>
                      <div className="shrink-0 text-sm font-medium">{it.quantity_g}g</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Rules / Warnings */}
        <section className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border bg-white p-5">
            <h3 className="text-sm font-semibold text-black/80">Regras</h3>
            <ul className="mt-3 space-y-2 text-sm text-black/80">
              {(plan.rules ?? []).length ? (
                plan.rules.map((r, i) => <li key={i} className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-black/60" />{r}</li>)
              ) : (
                <li className="text-black/60">—</li>
              )}
            </ul>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <h3 className="text-sm font-semibold text-black/80">Notas</h3>
            <ul className="mt-3 space-y-2 text-sm text-black/80">
              {(plan.warnings ?? []).length ? (
                plan.warnings.map((w, i) => <li key={i} className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-black/60" />{w}</li>)
              ) : (
                <li className="text-black/60">—</li>
              )}
            </ul>
          </div>
        </section>

        <footer className="pb-6 text-center text-xs text-black/50">
          Clean fitness vibe · nutrition-ai
        </footer>
      </div>
    </main>
  );
}
