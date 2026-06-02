"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconArrowRight,
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
  IconBread,
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

    // Forzar cambio de contraseña si es primer login.
    // Leemos de app_metadata (no editable por el usuario) con fallback a
    // user_metadata por compatibilidad con cuentas legacy todavía no migradas.
    const mustChange =
      data.user?.app_metadata?.must_change_password === true ||
      data.user?.user_metadata?.must_change_password === true;
    if (mustChange) {
      router.push("/staff/cambiar-password");
    } else {
      router.push("/staff/pedidos");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-6 pt-6 pb-10 max-w-md mx-auto bg-cafe">
      {/* Logo de marca — coherencia con landing del cliente */}
      <div className="w-full flex justify-center">
        <Image
          src="/logos/logo-02.png"
          alt="Masa Mía"
          width={72}
          height={72}
          priority
          style={{
            width: 72,
            height: "auto",
            display: "block",
          }}
        />
      </div>

      <div className="w-full flex flex-col items-center gap-3 mt-2">
        <Image
          src="/mascota/miga-chef.png"
          alt="Miga Chef"
          width={210}
          height={210}
          priority
          className="anim-breath"
        />
        <h1
          className="text-3xl text-crema text-center leading-none mt-1"
          style={{ fontFamily: "ReginaBlack" }}
        >
          La cocina te saluda
        </h1>
        <p className="text-xs text-caramelo text-center max-w-xs">
          El horno espera, las recetas también.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="w-full mt-6 flex flex-col gap-3 fade-up"
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
          <div
            key={error}
            className="text-xs text-[#FFB4A8] text-center px-2 error-shake"
          >
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

        <p className="text-[11px] text-caramelo text-center mt-3">
          ¿Olvidaste tu contraseña? Pídele a Mario que la resetee.
        </p>

        {/* Acceso rápido como cliente (para pruebas / cambiar de lado) */}
        <Link
          href="/"
          className="mt-6 w-full bg-transparent border border-caramelo/40 text-caramelo rounded-2xl py-2.5 text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition hover:bg-caramelo/10"
        >
          <IconBread size={14} />
          Ver la app como cliente
        </Link>
        <p className="text-[11px] text-caramelo/70 text-center mt-1 italic">
          Para hacer pruebas, ver el menú o probar un pedido.
        </p>
      </form>
    </main>
  );
}
