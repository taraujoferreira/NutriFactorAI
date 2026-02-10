"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Msg = { role: "assistant" | "user"; text: string };

type State = {
  sex?: "male" | "female";
  age?: number;
  heightCm?: number;
  weightKg?: number;
  activity?: "sedentary" | "light" | "moderate" | "high" | "athlete";
  goal?: "lose" | "maintain" | "gain";
  mealsPerDay?: number;
  dislikes: string[];
  allergies: string[];
};

const ACTIVITY_LABEL: Record<NonNullable<State["activity"]>, string> = {
  sedentary: "Sedentário",
  light: "Leve",
  moderate: "Moderado",
  high: "Alta",
  athlete: "Atleta",
};

const GOAL_LABEL: Record<NonNullable<State["goal"]>, string> = {
  lose: "Perder gordura",
  maintain: "Manter",
  gain: "Ganhar massa",
};

export default function ChatPage() {
  const r = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      text:
        "Vamos criar o teu plano. Primeiro: és Homem ou Mulher? (responde: homem/mulher)",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<State>({ dislikes: [], allergies: [] });

  const step = useMemo(() => {
    if (!state.sex) return "sex";
    if (!state.age) return "age";
    if (!state.heightCm) return "height";
    if (!state.weightKg) return "weight";
    if (!state.activity) return "activity";
    if (!state.goal) return "goal";
    if (!state.mealsPerDay) return "meals";
    return "done";
  }, [state]);

  function pushAssistant(text: string) {
    setMsgs((m) => [...m, { role: "assistant", text }]);
  }
  function pushUser(text: string) {
    setMsgs((m) => [...m, { role: "user", text }]);
  }

  function parseNumber(text: string) {
    const n = Number(text.replace(",", ".").trim());
    return Number.isFinite(n) ? n : null;
  }

  async function submit(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    pushUser(t);

    // respostas por step
    if (step === "sex") {
      const v = t.toLowerCase();
      if (v.includes("hom")) setState((s) => ({ ...s, sex: "male" }));
      else if (v.includes("mul")) setState((s) => ({ ...s, sex: "female" }));
      else {
        pushAssistant("Responde só: homem ou mulher 🙂");
        return;
      }
      pushAssistant("Idade?");
      return;
    }

    if (step === "age") {
      const n = parseNumber(t);
      if (!n || n < 16 || n > 90) {
        pushAssistant("Idade inválida. Ex: 24");
        return;
      }
      setState((s) => ({ ...s, age: Math.round(n) }));
      pushAssistant("Altura em cm? Ex: 178");
      return;
    }

    if (step === "height") {
      const n = parseNumber(t);
      if (!n || n < 130 || n > 230) {
        pushAssistant("Altura inválida. Ex: 178");
        return;
      }
      setState((s) => ({ ...s, heightCm: Math.round(n) }));
      pushAssistant("Peso em kg? Ex: 82");
      return;
    }

    if (step === "weight") {
      const n = parseNumber(t);
      if (!n || n < 35 || n > 250) {
        pushAssistant("Peso inválido. Ex: 82");
        return;
      }
      setState((s) => ({ ...s, weightKg: Math.round(n) }));
      pushAssistant(
        "Nível de atividade? (sedentario / leve / moderado / alta / atleta)"
      );
      return;
    }

    if (step === "activity") {
      const v = t.toLowerCase();
      const activity =
        v.includes("sed") ? "sedentary" :
        v.includes("lev") ? "light" :
        v.includes("mod") ? "moderate" :
        v.includes("alt") ? "high" :
        v.includes("atl") ? "athlete" :
        null;

      if (!activity) {
        pushAssistant("Escolhe: sedentario, leve, moderado, alta, atleta");
        return;
      }
      setState((s) => ({ ...s, activity }));
      pushAssistant("Objetivo? (perder / manter / ganhar)");
      return;
    }

    if (step === "goal") {
      const v = t.toLowerCase();
      const goal =
        v.includes("perd") ? "lose" :
        v.includes("mant") ? "maintain" :
        v.includes("ganh") ? "gain" :
        null;

      if (!goal) {
        pushAssistant("Escolhe: perder, manter ou ganhar");
        return;
      }
      setState((s) => ({ ...s, goal }));
      pushAssistant("Quantas refeições por dia? (3 a 6)");
      return;
    }

    if (step === "meals") {
      const n = parseNumber(t);
      if (!n || n < 3 || n > 6) {
        pushAssistant("Número inválido. Diz um valor entre 3 e 6.");
        return;
      }
      setState((s) => ({ ...s, mealsPerDay: Math.round(n) }));
      pushAssistant(
        "Algum alimento que não comes (dislikes) ou alergias? Se não, responde: nao"
      );
      return;
    }

    if (step === "done") {
      // última pergunta (dislikes/alergias)
      const v = t.toLowerCase();
      let dislikes: string[] = [];
      let allergies: string[] = [];
      if (!v.startsWith("nao")) {
        // formato simples: "dislikes: ... | alergias: ..."
        const parts = t.split("|").map((p) => p.trim());
        for (const p of parts) {
          const low = p.toLowerCase();
          if (low.startsWith("dislikes:")) dislikes = p.slice(9).split(",").map(s => s.trim()).filter(Boolean);
          else if (low.startsWith("alergias:")) allergies = p.slice(9).split(",").map(s => s.trim()).filter(Boolean);
          else {
            // se o user meter só lista, assume dislikes
            dislikes = t.split(",").map(s => s.trim()).filter(Boolean);
          }
        }
      }

      const payload = {
        sex: state.sex!,
        age: state.age!,
        heightCm: state.heightCm!,
        weightKg: state.weightKg!,
        activity: state.activity!,
        goal: state.goal!,
        mealsPerDay: state.mealsPerDay!,
        dislikes,
        allergies,
      };

      pushAssistant(
        `Ok ✅ Vou gerar o teu plano (${GOAL_LABEL[payload.goal]}, ${ACTIVITY_LABEL[payload.activity]}, ${payload.mealsPerDay} refeições).`
      );

      setBusy(true);
      try {
        const res = await fetch("/api/nutrition/plan/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const details = Array.isArray(data.details) ? "\n" + data.details.map((d: string) => `- ${d}`).join("\n") : "";
          pushAssistant((data.error ?? "Deu erro a gerar o plano.") + details);
          setBusy(false);
          return;
        }


        pushAssistant("Plano criado! A abrir…");
        r.push("/plan");
      } catch (e: any) {
        pushAssistant(e?.message ?? "Erro inesperado.");
      } finally {
        setBusy(false);
      }
    }
  }

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Chat Nutrição</h1>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
          }}
        >
          <button className="text-sm underline">Logout</button>
        </form>
      </header>

      <div className="flex-1 rounded-2xl border p-4 space-y-3 overflow-auto">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl p-3 text-sm ${
              m.role === "assistant" ? "border" : "border ml-auto"
            }`}
          >
            {m.text}
          </div>
        ))}
        {busy && <div className="text-sm text-gray-500">A gerar plano…</div>}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <input
          className="flex-1 rounded-xl border p-3"
          placeholder="Escreve aqui…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <button className="rounded-xl border px-4" disabled={busy}>
          Enviar
        </button>
      </form>

      <p className="text-xs text-gray-500">
        Dica: para dislikes/alergias podes escrever: <b>dislikes: atum, leite | alergias: amendoim</b>
      </p>
    </main>
  );
}
