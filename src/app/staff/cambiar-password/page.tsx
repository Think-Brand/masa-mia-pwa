"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconArrowRight,
  IconEye,
  IconEyeOff,
  IconLock,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";

export default function CambiarPassword() {
  const router = useRouter();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (pwd.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (pwd !== pwd2) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Cambia password y limpia el flag must_change_password
    const { error } = await supabase.auth.updateUser({
      password: pwd,
      data: { must_change_password: false },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/staff/pedidos");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10 max-w-md mx-auto bg-cafe">
      <div className="w-full flex flex-col items-center gap-3">
        <Image
          src="/mascota/miga-tierna.png"
          alt="Miga"
          width={120}
          height={120}
          priority
        />
        <h1
          className="text-2xl text-crema text-center leading-tight"
          style={{ fontFamily: "ReginaBlack" }}
        >
          Tu primera contraseña
        </h1>
        <p className="text-xs text-caramelo text-center max-w-xs leading-relaxed">
          Por seguridad, cámbiala antes de entrar.
          <br />
          <span className="italic">Mínimo 8 caracteres.</span>
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="w-full mt-6 flex flex-col gap-3 fade-up"
      >
        <div className="relative">
          <IconLock
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-crema/60"
          />
          <input
            type={showPwd ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Nueva contraseña"
            required
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            className="w-full bg-canela-soft text-crema border border-caramelo rounded-2xl pl-10 pr-10 py-3 text-sm placeholder:text-crema/70 focus:outline-none focus:border-crema transition"
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-crema/70"
          >
            {showPwd ? <IconEyeOff size={18} /> : <IconEye size={18} />}
          </button>
        </div>

        <div className="relative">
          <IconLock
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-crema/60"
          />
          <input
            type={showPwd ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Confirma la contraseña"
            required
            value={pwd2}
            onChange={(e) => setPwd2(e.target.value)}
            className="w-full bg-canela-soft text-crema border border-caramelo rounded-2xl pl-10 pr-4 py-3 text-sm placeholder:text-crema/70 focus:outline-none focus:border-crema transition"
          />
        </div>

        {error && (
          <div className="text-xs text-[#FFB4A8] text-center px-2 fade-up">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-crema text-cafe rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60 mt-2"
        >
          {loading ? (
            "Guardando…"
          ) : (
            <>
              Guardar y entrar <IconArrowRight size={16} />
            </>
          )}
        </button>
      </form>
    </main>
  );
}
