"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconArrowRight,
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";

export default function StaffLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Email o contraseña no coinciden."
          : error.message
      );
      setLoading(false);
      return;
    }

    // Forzar cambio de contraseña si es primer login
    const mustChange =
      data.user?.user_metadata?.must_change_password === true;
    if (mustChange) {
      router.push("/staff/cambiar-password");
    } else {
      router.push("/staff/pedidos");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10 max-w-md mx-auto bg-cafe">
      <div className="w-full flex flex-col items-center gap-4">
        <Image
          src="/mascota/miga-chef.png"
          alt="Miga Chef"
          width={140}
          height={140}
          priority
          className="anim-breath"
        />
        <h1
          className="text-3xl text-crema text-center leading-none mt-2"
          style={{ fontFamily: "ReginaBlack" }}
        >
          Hola, cocinera
        </h1>
        <p className="text-xs text-caramelo text-center max-w-xs">
          El delantal espera, las recetas también.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="w-full mt-8 flex flex-col gap-3 fade-up"
      >
        <div className="relative">
          <IconMail
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-crema/60"
          />
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="Tu correo"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-canela-soft text-crema border border-caramelo rounded-2xl pl-10 pr-4 py-3 text-sm placeholder:text-crema/70 focus:outline-none focus:border-crema transition"
          />
        </div>

        <div className="relative">
          <IconLock
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-crema/60"
          />
          <input
            type={showPwd ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Contraseña"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-canela-soft text-crema border border-caramelo rounded-2xl pl-10 pr-10 py-3 text-sm placeholder:text-crema/70 focus:outline-none focus:border-crema transition"
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            aria-label={showPwd ? "Ocultar" : "Mostrar"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-crema/70"
          >
            {showPwd ? <IconEyeOff size={18} /> : <IconEye size={18} />}
          </button>
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
            "Entrando…"
          ) : (
            <>
              Entrar a la cocina <IconArrowRight size={16} />
            </>
          )}
        </button>

        <p className="text-[10px] text-caramelo text-center mt-3">
          ¿Olvidaste tu contraseña? Pídele a Mario que la resetee.
        </p>
      </form>
    </main>
  );
}
