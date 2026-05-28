"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrowRight } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { useCarrito } from "@/components/CarritoProvider";
import Miga from "@/components/Miga";

export default function LeadGate() {
  const router = useRouter();
  const { cliente, setCliente } = useCarrito();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si ya hay cliente registrado, mándalo al catálogo
  useEffect(() => {
    if (cliente?.whatsapp) {
      router.replace("/catalogo");
    }
  }, [cliente, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanWa = whatsapp.replace(/\D/g, "");

    if (cleanName.length < 2) {
      setError("Necesito un nombre, aunque sea de cariño.");
      return;
    }
    if (cleanWa.length !== 10) {
      setError("El WhatsApp va a 10 dígitos, sin lada de país.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      // Buscar si ya existe el cliente
      const { data: existing } = await supabase
        .from("customers")
        .select("id, name, whatsapp")
        .eq("whatsapp", cleanWa)
        .maybeSingle();

      let customerId: string;
      if (existing) {
        customerId = existing.id;
      } else {
        const { data: nuevo, error: insErr } = await supabase
          .from("customers")
          .insert({ name: cleanName, whatsapp: cleanWa })
          .select("id")
          .single();
        if (insErr) throw insErr;
        customerId = nuevo.id;
      }

      setCliente({ id: customerId, name: cleanName, whatsapp: cleanWa });
      router.push("/catalogo");
    } catch (err: any) {
      console.error(err);
      setError("Algo pasó al guardar. Intenta otra vez.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-between px-6 py-10 max-w-md mx-auto">
      <div className="flex-1 flex flex-col items-center justify-center text-center pt-4">
        <Miga pose="adorable" animation="bounce" size={170} priority />
        <h1
          className="text-4xl mt-4 leading-none text-cafe"
          style={{ fontFamily: "ReginaBlack" }}
        >
          ¿Listos para
          <br />
          el antojo?
        </h1>
        <p className="text-canela text-xs mt-4 max-w-[260px] leading-relaxed">
          Déjanos saber quién eres y te mostramos el menú completo.
          <br />
          <span className="text-caramelo italic">
            (Yo solo huelo, los chefs son otros.)
          </span>
        </p>
      </div>

      <form onSubmit={onSubmit} className="w-full flex flex-col gap-3 fade-up">
        <input
          type="text"
          inputMode="text"
          autoComplete="given-name"
          placeholder="Tu nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-white border border-caramelo rounded-2xl px-4 py-3 text-sm text-cafe placeholder:text-cafe/40 focus:outline-none focus:border-cafe transition"
        />
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="WhatsApp · 10 dígitos"
          maxLength={10}
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
          className="w-full bg-white border border-caramelo rounded-2xl px-4 py-3 text-sm text-cafe placeholder:text-cafe/40 focus:outline-none focus:border-cafe transition"
        />

        {error && (
          <div className="text-xs text-[#C0392B] text-center px-2 fade-up">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-cafe text-crema rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-70"
        >
          {loading ? "Anotando..." : (
            <>
              Ver el menú <IconArrowRight size={16} />
            </>
          )}
        </button>

        <p className="text-[10px] text-canela text-center mt-1">
          Sin spam. Solo cuando hay algo rico.
        </p>
      </form>
    </main>
  );
}
