"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error ?? "Erro ao criar conta");
      return;
    }

    r.push("/chat");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Criar conta</h1>

        <div className="space-y-2">
          <label className="text-sm">Email</label>
          <input className="w-full rounded-xl border p-3" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="text-sm">Password</label>
          <input className="w-full rounded-xl border p-3" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-xs text-gray-500">Mínimo 8 caracteres.</p>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <button disabled={loading} className="w-full rounded-xl border p-3 font-medium">
          {loading ? "A criar..." : "Criar conta"}
        </button>

        <p className="text-sm text-gray-600">
          Já tens conta?{" "}
          <a className="underline" href="/login">
            Entrar
          </a>
        </p>
      </form>
    </main>
  );
}
