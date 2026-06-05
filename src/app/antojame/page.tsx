"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconRefresh,
  IconShoppingBag,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { Product } from "@/lib/types";
import { useCarrito } from "@/components/CarritoProvider";
import Miga, { MigaPose, MigaAnim } from "@/components/Miga";
import BottomNav from "@/components/BottomNav";

type Occasion = "para_mi" | "compartir" | "regalo" | "probadita";
type Flavor = "chocolatoso" | "frutal" | "frutos_secos" | "cremoso";
type Attitude = "seguro" | "sorpresa" | "probar_suerte";
type Step = "intro" | 1 | 2 | 3 | "resultado";

// Mapeo de sabores a nombres de productos
const FLAVOR_PRODUCTS: Record<Flavor, string[]> = {
  chocolatoso: ["Mil Besos", "Black & White", "Frutella", "Nutella"],
  frutal: ["Mangoco", "Frutella"],
  frutos_secos: ["Pistachito", "RollSnicker", "Nueztro Secreto"],
  cremoso: ["Lotusho", "Original"],
};

// Las imágenes de Miga viven en /public/mascota/antojame y cuentan visualmente
// la decisión que está tomando el cliente. Cada opción tiene su color de
// fondo + borde para que cada decisión tenga personalidad propia y rompa
// la monotonía del card blanco. La Miga DESBORDA el card hacia arriba —
// esa técnica "rompe el marco" para que el diseño se sienta dinámico.
const OPTIONS_OCCASION = [
  {
    key: "para_mi" as Occasion,
    image: "/mascota/antojame/para-mi.png",
    label: "Para mí",
    sub: "Ya traigo hambre",
    bg: "#FFE5D6",
    accent: "#F25C20",
  },
  {
    key: "compartir" as Occasion,
    image: "/mascota/antojame/para-compartir.png",
    label: "Para compartir",
    sub: "Botanear con alguien",
    bg: "#FCE8A0",
    accent: "#B57A00",
  },
  {
    key: "regalo" as Occasion,
    image: "/mascota/antojame/un-regalo.png",
    label: "Es un regalo",
    sub: "Detalle especial",
    bg: "#F5C8D4",
    accent: "#C03070",
  },
  {
    key: "probadita" as Occasion,
    image: "/mascota/antojame/una-probadita.png",
    label: "Una probadita",
    sub: "Solo un antojo chico",
    bg: "#CDE8C5",
    accent: "#3B7A28",
  },
];

const OPTIONS_FLAVOR = [
  {
    key: "chocolatoso" as Flavor,
    image: "/mascota/antojame/Chocolatoso.png",
    label: "Chocolatoso",
    bg: "#E0BFA8",
    accent: "#5C3A1D",
  },
  {
    key: "frutal" as Flavor,
    image: "/mascota/antojame/Frutal.png",
    label: "Frutal y fresco",
    bg: "#FFCCD6",
    accent: "#B8264C",
  },
  {
    key: "frutos_secos" as Flavor,
    image: "/mascota/antojame/Secos.png",
    label: "Con frutos secos",
    bg: "#E5C892",
    accent: "#7A4F0F",
  },
  {
    key: "cremoso" as Flavor,
    image: "/mascota/antojame/Cremoso.png",
    label: "Cremoso y clásico",
    bg: "#FBF0D9",
    accent: "#A6772A",
  },
];

const OPTIONS_ATTITUDE = [
  {
    key: "seguro" as Attitude,
    image: "/mascota/antojame/A-la-segura.png",
    label: "A lo seguro",
    sub: "Dame el favorito",
    bg: "#C8E0F4",
    accent: "#1F5C9B",
  },
  {
    key: "sorpresa" as Attitude,
    image: "/mascota/antojame/Sorpr%C3%A9ndeme.png",
    label: "Sorpréndeme",
    sub: "Algo distinto",
    bg: "#F5C0D1",
    accent: "#A02559",
  },
  {
    key: "probar_suerte" as Attitude,
    image: "/mascota/antojame/Probar-suerte.png",
    label: "Probar suerte",
    sub: "Lo que la masa decida",
    bg: "#FCE8A0",
    accent: "#B57A00",
  },
];

// Frases finales de Miga según la combinación
const FRASES_RESULTADO = [
  "¡Ya sé! Te late este.",
  "Mi recomendación de hoy, sin dudar.",
  "Yo iría por este sin pensarlo dos veces.",
  "Confía en mí, este es el que.",
  "Te tengo el antojo perfecto.",
];

function pickProduct(
  occasion: Occasion,
  flavor: Flavor,
  attitude: Attitude,
  pool: Product[]
): { main: Product | null; suggestions: Product[] } {
  // 1. Filtrar por categoría según ocasión
  let candidates: Product[] = [];

  if (occasion === "regalo") {
    candidates = pool.filter((p) => p.category === "luvinbox");
  } else if (occasion === "compartir") {
    candidates = pool.filter((p) => p.category === "rollinbox");
  } else if (occasion === "probadita") {
    // Berlinesa preferida si el sabor lo permite
    const berlinesas = pool.filter((p) => p.category === "berlinesa");
    const filtroSabor = FLAVOR_PRODUCTS[flavor];
    candidates = berlinesas.filter((p) => filtroSabor.includes(p.name));
    if (candidates.length === 0) {
      // Si el sabor no cae en berlinesa, va rol pero el más chico
      candidates = pool.filter(
        (p) => p.category === "rol" && filtroSabor.includes(p.name)
      );
    }
  } else {
    // para_mi → rol del sabor pedido
    const filtroSabor = FLAVOR_PRODUCTS[flavor];
    candidates = pool.filter(
      (p) => p.category === "rol" && filtroSabor.includes(p.name)
    );
  }

  // Si no hay match, fallback a productos del sabor pedido en cualquier categoría
  if (candidates.length === 0) {
    const filtroSabor = FLAVOR_PRODUCTS[flavor];
    candidates = pool.filter((p) => filtroSabor.includes(p.name));
  }

  if (candidates.length === 0) return { main: null, suggestions: [] };

  // 2. Escoger según actitud
  let main: Product;
  if (attitude === "seguro") {
    main = candidates[0]; // Primero por sort_order
  } else if (attitude === "sorpresa") {
    main = candidates[candidates.length - 1];
  } else {
    main = candidates[Math.floor(Math.random() * candidates.length)];
  }

  // 3. Sugerencias: 2 productos distintos al main, variados
  const otros = pool.filter((p) => p.id !== main.id);
  const sameCat = otros.filter((p) => p.category === main.category);
  const otherCat = otros.filter((p) => p.category !== main.category);
  const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);
  const suggestions = [
    ...shuffle(sameCat).slice(0, 1),
    ...shuffle(otherCat).slice(0, 1),
  ].filter(Boolean);

  return { main, suggestions };
}

export default function Antojame() {
  const router = useRouter();
  const { cliente, add, ready } = useCarrito();
  const [step, setStep] = useState<Step>("intro");
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [flavor, setFlavor] = useState<Flavor | null>(null);
  const [attitude, setAttitude] = useState<Attitude | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [fraseResultado] = useState(
    FRASES_RESULTADO[Math.floor(Math.random() * FRASES_RESULTADO.length)]
  );

  useEffect(() => {
    // Antójame es PÚBLICO — no requiere cliente logueado. Solo cuando el
    // cliente decide agregar al carrito se pide registro (Modelo B). Antes
    // redirigíamos a "/" si no había cliente válido, lo que rompía el flow
    // de un usuario nuevo que toca el banner "¡Antójame!" en la home.
    const supabase = createClient();
    supabase
      .from("products")
      .select("*")
      .eq("is_public", true)
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        setProducts(data ?? []);
        setLoading(false);
      });
  }, []);

  const resultado =
    step === "resultado" && occasion && flavor && attitude
      ? pickProduct(occasion, flavor, attitude, products)
      : null;

  const reset = () => {
    setOccasion(null);
    setFlavor(null);
    setAttitude(null);
    setStep("intro");
    setAdded(false);
  };

  const onAdd = () => {
    if (!resultado?.main) return;
    add(resultado.main);
    setAdded(true);
    setTimeout(() => router.push("/carrito"), 700);
  };

  // Antójame es PÚBLICO — renderiza sin requerir cliente. El registro se
  // pide cuando intentan agregar al carrito (en la propia página /carrito).

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto pb-24">
      <header className="sticky top-0 z-30 bg-crema/95 backdrop-blur flex items-center justify-between px-4 py-3 border-b border-caramelo/20">
        <button onClick={() => router.back()} className="text-cafe">
          <IconArrowLeft size={20} />
        </button>
        <h1
          className="text-2xl text-cafe"
          style={{ fontFamily: "ReginaBlack" }}
        >
          Antójame
        </h1>
        <div className="w-5" />
      </header>

      {/* Barra de progreso */}
      {step !== "intro" && step !== "resultado" && (
        <div className="px-4 pt-3">
          <div className="flex gap-1">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`flex-1 h-1.5 rounded-full transition ${
                  n <= step ? "bg-antojo" : "bg-canela/20"
                }`}
              />
            ))}
          </div>
          <div className="text-[11px] text-canela mt-1.5 text-center">
            Pregunta {step} de 3
          </div>
        </div>
      )}

      <div className="flex-1 px-5 pt-6 flex flex-col gap-5">
        {/* INTRO — Miga grande protagonista */}
        {step === "intro" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 fade-up">
            <Miga emocion="idea" animation="breath" size={260} priority />
            <h2
              className="text-3xl text-cafe leading-none"
              style={{ fontFamily: "ReginaBlack" }}
            >
              ¡Vamos a darte gusto!
            </h2>
            <p className="text-sm text-canela max-w-[280px] leading-relaxed">
              Te hago <b>3 preguntas rapiditas</b> y te digo qué pedir.
              <br />
              <span className="text-caramelo italic">
                Yo no horneo, pero sí sé qué sabe rico.
              </span>
            </p>
            <button
              onClick={() => setStep(1)}
              className="btn-masa btn-masa-primary mt-4 px-8 py-3 text-sm flex items-center gap-2 font-bold"
              style={{ fontFamily: "Termina" }}
            >
              Empezar <IconArrowRight size={16} />
            </button>
          </div>
        )}

        {/* PREGUNTA 1 — OCASIÓN — cards color + Miga desbordando arriba */}
        {step === 1 && (
          <div className="fade-up">
            <h2
              className="text-2xl text-cafe leading-tight text-center"
              style={{ fontFamily: "ReginaBlack" }}
            >
              ¿Para qué es<br />este antojo?
            </h2>
            <div className="mt-16 grid grid-cols-2 gap-x-3 gap-y-14">
              {OPTIONS_OCCASION.map((opt) => {
                const active = occasion === opt.key;
                return (
                  <OptionCard
                    key={opt.key}
                    active={active}
                    bg={opt.bg}
                    accent={opt.accent}
                    label={opt.label}
                    sub={opt.sub}
                    image={opt.image}
                    onClick={() => {
                      setOccasion(opt.key);
                      setTimeout(() => setStep(2), 280);
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* PREGUNTA 2 — SABOR — mismo sistema visual */}
        {step === 2 && (
          <div className="fade-up">
            <h2
              className="text-2xl text-cafe leading-tight text-center"
              style={{ fontFamily: "ReginaBlack" }}
            >
              ¿Qué te late<br />hoy?
            </h2>
            <div className="mt-16 grid grid-cols-2 gap-x-3 gap-y-14">
              {OPTIONS_FLAVOR.map((opt) => {
                const active = flavor === opt.key;
                return (
                  <OptionCard
                    key={opt.key}
                    active={active}
                    bg={opt.bg}
                    accent={opt.accent}
                    label={opt.label}
                    image={opt.image}
                    onClick={() => {
                      setFlavor(opt.key);
                      setTimeout(() => setStep(3), 280);
                    }}
                  />
                );
              })}
            </div>
            <button
              onClick={() => setStep(1)}
              className="mt-4 text-xs text-canela underline mx-auto block"
            >
              ← Volver
            </button>
          </div>
        )}

        {/* PREGUNTA 3 — ACTITUD — formato vertical, Miga sale por la derecha */}
        {step === 3 && (
          <div className="fade-up">
            <h2
              className="text-2xl text-cafe leading-tight text-center"
              style={{ fontFamily: "ReginaBlack" }}
            >
              ¿Vamos a lo seguro<br />o nos arriesgamos?
            </h2>
            <div className="mt-6 flex flex-col gap-4">
              {OPTIONS_ATTITUDE.map((opt) => {
                const active = attitude === opt.key;
                return (
                  <AttitudeCard
                    key={opt.key}
                    active={active}
                    bg={opt.bg}
                    accent={opt.accent}
                    label={opt.label}
                    sub={opt.sub}
                    image={opt.image}
                    onClick={() => {
                      setAttitude(opt.key);
                      setTimeout(() => setStep("resultado"), 280);
                    }}
                  />
                );
              })}
            </div>
            <button
              onClick={() => setStep(2)}
              className="mt-4 text-xs text-canela underline mx-auto block"
            >
              ← Volver
            </button>
          </div>
        )}

        {/* RESULTADO */}
        {step === "resultado" && (
          <div className="fade-up flex flex-col items-center text-center gap-3">
            <Miga emocion="celebrando" animation="jump" size={120} priority />
            <div
              className="text-xl text-cafe leading-tight max-w-xs"
              style={{ fontFamily: "ReginaBlack" }}
            >
              {fraseResultado}
            </div>

            {loading && (
              <p className="text-canela text-sm mt-2">Buscando…</p>
            )}

            {!loading && resultado?.main && (
              <>
                <article className="w-full bg-white rounded-2xl overflow-hidden shadow-lg mt-2">
                  {resultado.main.image_url && (
                    <Image
                      src={resultado.main.image_url}
                      alt={resultado.main.name}
                      width={500}
                      height={500}
                      className="w-full aspect-square object-cover"
                      priority
                    />
                  )}
                  <div className="p-4 text-left">
                    <div className="flex items-baseline justify-between gap-2">
                      <div
                        className="text-2xl text-cafe"
                        style={{ fontFamily: "ReginaBlack" }}
                      >
                        {resultado.main.name}
                      </div>
                      <div
                        className="text-xl text-[#F25C20]"
                        style={{ fontFamily: "ReginaBlack" }}
                      >
                        {resultado.main.price_is_starting && (
                          <span className="text-[11px] text-canela font-normal mr-0.5">
                            desde
                          </span>
                        )}
                        ${Number(resultado.main.price).toFixed(0)}
                      </div>
                    </div>
                    {resultado.main.description && (
                      <p className="text-xs text-cafe mt-2 leading-relaxed">
                        {resultado.main.description}
                      </p>
                    )}
                  </div>
                </article>

                {/* Botones */}
                <div className="w-full flex flex-col gap-2 mt-2">
                  <button
                    onClick={onAdd}
                    disabled={added}
                    className="w-full bg-antojo text-white rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg disabled:opacity-70"
                  >
                    {added ? (
                      <>
                        <IconCheck size={16} /> ¡Agregado!
                      </>
                    ) : (
                      <>
                        Agregar al pedido <IconShoppingBag size={16} />
                      </>
                    )}
                  </button>
                  <button
                    onClick={reset}
                    className="w-full bg-white text-cafe border border-canela/40 rounded-2xl py-2.5 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <IconRefresh size={14} />
                    Volver a empezar
                  </button>
                </div>

                {/* Sugerencias */}
                {resultado.suggestions.length > 0 && (
                  <div className="w-full mt-4 text-left">
                    <div className="text-[11px] font-bold text-canela uppercase tracking-wider mb-2">
                      O quizás te late
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {resultado.suggestions.map((s) => {
                        const isBox =
                          s.category === "rollinbox" ||
                          s.category === "luvinbox";
                        const href = isBox
                          ? `/box/${s.name.toLowerCase().replace(/\s+/g, "-")}?id=${s.id}`
                          : `/producto/${s.name.toLowerCase().replace(/\s+/g, "-")}?id=${s.id}`;
                        return (
                          <Link
                            key={s.id}
                            href={href}
                            className="bg-white rounded-xl p-2 text-center shadow-sm active:scale-95"
                          >
                            {s.image_url && (
                              <Image
                                src={s.image_url}
                                alt={s.name}
                                width={120}
                                height={120}
                                className="w-full aspect-square object-cover rounded-lg"
                              />
                            )}
                            <div
                              className="text-[11px] font-bold text-cafe mt-1.5"
                              style={{ fontFamily: "Termina" }}
                            >
                              {s.name}
                            </div>
                            <div
                              className="text-[11px] text-[#F25C20]"
                              style={{ fontFamily: "Termina" }}
                            >
                              ${Number(s.price).toFixed(0)}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {!loading && !resultado?.main && (
              <p className="text-canela text-sm">
                No encontré algo perfecto para esa combinación. Échale otra
                vez 🤎
              </p>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

/**
 * Card de opción para Step 1 y 2 (Ocasión y Sabor).
 * Card de COLOR (no blanco). La imagen de Miga sobresale del top del card
 * con margin-top negativo — rompe el marco para diseño dinámico tipo
 * referencia que mostró Mario (no "cuadro dentro de cuadro").
 */
function OptionCard({
  active,
  bg,
  accent,
  label,
  sub,
  image,
  onClick,
}: {
  active: boolean;
  bg: string;
  accent: string;
  label: string;
  sub?: string;
  image: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative pt-12 px-3 pb-4 rounded-3xl text-center transition active:scale-[0.97] flex flex-col items-center"
      style={{
        background: bg,
        boxShadow: active
          ? `0 14px 28px ${hexA(accent, 0.32)}, 0 0 0 3px ${accent}`
          : `0 10px 22px ${hexA(accent, 0.18)}, inset 0 -3px 8px ${hexA(accent, 0.12)}`,
      }}
    >
      {/* Miga DESBORDA hacia arriba del card */}
      <div className="absolute -top-14 left-1/2 -translate-x-1/2 w-32 h-32">
        <Image
          src={image}
          alt={label}
          fill
          sizes="128px"
          className="object-contain drop-shadow-lg"
        />
      </div>

      <div
        className="text-sm font-bold leading-tight"
        style={{ fontFamily: "Termina", color: accent }}
      >
        {label}
      </div>
      {sub && (
        <div
          className="text-[11px] leading-tight mt-0.5 px-1"
          style={{ color: hexA(accent, 0.75) }}
        >
          {sub}
        </div>
      )}
    </button>
  );
}

/**
 * Card de actitud para Step 3.
 * Layout horizontal: Miga sale por la izquierda y arriba (no contenida).
 * Color de fondo distinto a las opciones de antes para que se sienta
 * "última decisión, más íntima".
 */
function AttitudeCard({
  active,
  bg,
  accent,
  label,
  sub,
  image,
  onClick,
}: {
  active: boolean;
  bg: string;
  accent: string;
  label: string;
  sub: string;
  image: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative rounded-3xl text-left transition active:scale-[0.98] flex items-center gap-3 pl-28 pr-4 py-4"
      style={{
        background: bg,
        minHeight: 100,
        boxShadow: active
          ? `0 14px 28px ${hexA(accent, 0.32)}, 0 0 0 3px ${accent}`
          : `0 10px 22px ${hexA(accent, 0.18)}, inset 0 -3px 8px ${hexA(accent, 0.12)}`,
      }}
    >
      {/* Miga sale por izquierda + un poco arriba — desborda */}
      <div className="absolute -left-3 -top-6 w-32 h-32">
        <Image
          src={image}
          alt={label}
          fill
          sizes="128px"
          className="object-contain drop-shadow-lg"
        />
      </div>

      <div className="flex-1">
        <div
          className="text-lg font-bold leading-tight"
          style={{ fontFamily: "Termina", color: accent }}
        >
          {label}
        </div>
        <div
          className="text-xs mt-0.5"
          style={{ color: hexA(accent, 0.75) }}
        >
          {sub}
        </div>
      </div>
      <IconArrowRight size={20} style={{ color: accent, opacity: 0.6 }} />
    </button>
  );
}

/** Convierte hex a rgba con alpha — para sombras tinted de cada opción. */
function hexA(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
