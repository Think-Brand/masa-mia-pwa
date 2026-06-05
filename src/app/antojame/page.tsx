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
import { isBox, productHref } from "@/lib/productLink";
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
// la decisión. Cada opción tiene su color saturado + scale opcional para
// normalizar el tamaño visual entre composiciones con 1 o 2 figuras
// (ej. para-compartir tiene 2 Migas → necesita scale 1.18 para empatar
// con un Miga solo).
// Paleta OSCURA: tomamos los colores PROFUNDOS de los textos de los rolls
// del catálogo. La Miga (naranja-café cálido) destaca con máximo contraste
// sobre estos fondos saturados oscuros. Texto en crema/blanco para
// legibilidad sobre fondos oscuros.
const OPTIONS_OCCASION = [
  {
    key: "para_mi" as Occasion,
    image: "/mascota/antojame/para-mi.png",
    label: "Para mí",
    sub: "Ya traigo hambre",
    bg: "#C2440B",       // naranja antojo oscuro
    accent: "#FFFFFF",
    subColor: "rgba(255,255,255,0.75)",
    scale: 1.0,
  },
  {
    key: "compartir" as Occasion,
    image: "/mascota/antojame/para-compartir.png",
    label: "Para compartir",
    sub: "Botanear con alguien",
    bg: "#0E4A4B",       // turquesa profundo Mangoco
    accent: "#FFFFFF",
    subColor: "rgba(255,255,255,0.75)",
    scale: 1.18,
  },
  {
    key: "regalo" as Occasion,
    image: "/mascota/antojame/un-regalo.png",
    label: "Es un regalo",
    sub: "Detalle especial",
    bg: "#8A0E3E",       // magenta vino Frutella
    accent: "#FFFFFF",
    subColor: "rgba(255,255,255,0.75)",
    scale: 1.08,
  },
  {
    key: "probadita" as Occasion,
    image: "/mascota/antojame/una-probadita.png",
    label: "Una probadita",
    sub: "Solo un antojo chico",
    bg: "#3B6D11",       // verde bosque Pistachito
    accent: "#FFFFFF",
    subColor: "rgba(255,255,255,0.75)",
    scale: 1.04,
  },
];

const OPTIONS_FLAVOR = [
  {
    key: "chocolatoso" as Flavor,
    image: "/mascota/antojame/Chocolatoso.png",
    label: "Chocolatoso",
    bg: "#3D1F0A",       // chocolate oscuro Mil Besos
    accent: "#FFEAA0",
    subColor: "rgba(255,234,160,0.7)",
    scale: 1.0,
  },
  {
    key: "frutal" as Flavor,
    image: "/mascota/antojame/Frutal.png",
    label: "Frutal y fresco",
    bg: "#A0143E",       // rojo vino Frutella
    accent: "#FFE0E8",
    subColor: "rgba(255,224,232,0.75)",
    scale: 1.0,
  },
  {
    key: "frutos_secos" as Flavor,
    image: "/mascota/antojame/Secos.png",
    label: "Con frutos secos",
    bg: "#5A3508",       // tostado oscuro RollSnicker
    accent: "#FFF5DA",
    subColor: "rgba(255,245,218,0.7)",
    scale: 1.0,
  },
  {
    key: "cremoso" as Flavor,
    image: "/mascota/antojame/Cremoso.png",
    label: "Cremoso y clásico",
    bg: "#7A5510",       // caramelo oscuro Mil Besos
    accent: "#FFF5DA",
    subColor: "rgba(255,245,218,0.75)",
    scale: 1.0,
  },
];

const OPTIONS_ATTITUDE = [
  {
    key: "seguro" as Attitude,
    image: "/mascota/antojame/A-la-segura.png",
    label: "A lo seguro",
    sub: "Dame el favorito",
    bg: "#0F3E70",       // azul confianza profundo
    accent: "#FFFFFF",
    subColor: "rgba(255,255,255,0.75)",
    scale: 1.0,
  },
  {
    key: "sorpresa" as Attitude,
    image: "/mascota/antojame/Sorprendeme.png",
    label: "Sorpréndeme",
    sub: "Algo distinto",
    bg: "#7D113F",       // magenta vino
    accent: "#FFFFFF",
    subColor: "rgba(255,255,255,0.75)",
    scale: 1.0,
  },
  {
    key: "probar_suerte" as Attitude,
    image: "/mascota/antojame/Probar-suerte.png",
    label: "Probar suerte",
    sub: "Lo que la masa decida",
    bg: "#7A5510",       // ámbar oscuro
    accent: "#FFFFFF",
    subColor: "rgba(255,255,255,0.75)",
    scale: 1.0,
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

  // Scroll a top INSTANT (no smooth) cada vez que cambia el step.
  // El smooth daba la sensación de "la opción desapareció" — instant
  // hace que el step nuevo aparezca limpio desde top sin animación.
  // Hacemos múltiples llamadas para cubrir todos los navegadores y
  // contenedores scrolleables que iOS Safari maneja distinto.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reset = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    reset();
    // Volver a forzar después de un tick para cuando el step recién
    // renderizado mide su altura
    requestAnimationFrame(reset);
  }, [step]);
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [flavor, setFlavor] = useState<Flavor | null>(null);
  const [attitude, setAttitude] = useState<Attitude | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  // Aviso cuando intentan agregar una caja (RollinBox/LuvinBox) sin armarla.
  const [avisoCaja, setAvisoCaja] = useState(false);
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
    setAvisoCaja(false);
  };

  const onAdd = () => {
    if (!resultado?.main) return;
    // Las cajas (RollinBox/LuvinBox) NO se agregan directo: hay que armarlas
    // primero (elegir sabores / ingredientes). Avisamos y llevamos a armar.
    if (isBox(resultado.main)) {
      setAvisoCaja(true);
      setTimeout(() => router.push(productHref(resultado.main!)), 1100);
      return;
    }
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
            <div className="mt-5 grid grid-cols-2 gap-3">
              {OPTIONS_OCCASION.map((opt, i) => {
                const active = occasion === opt.key;
                return (
                  <OptionCard
                    key={opt.key}
                    index={i}
                    active={active}
                    bg={opt.bg}
                    accent={opt.accent}
                    subColor={opt.subColor}
                    label={opt.label}
                    sub={opt.sub}
                    image={opt.image}
                    onClick={() => {
                      setOccasion(opt.key);
                      setTimeout(() => setStep(2), 320);
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
            <div className="mt-5 grid grid-cols-2 gap-3">
              {OPTIONS_FLAVOR.map((opt, i) => {
                const active = flavor === opt.key;
                return (
                  <OptionCard
                    key={opt.key}
                    index={i}
                    active={active}
                    bg={opt.bg}
                    accent={opt.accent}
                    subColor={opt.subColor}
                    label={opt.label}
                    image={opt.image}
                    onClick={() => {
                      setFlavor(opt.key);
                      setTimeout(() => setStep(3), 320);
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
            <div className="mt-5 flex flex-col gap-3">
              {OPTIONS_ATTITUDE.map((opt, i) => {
                const active = attitude === opt.key;
                return (
                  <AttitudeCard
                    key={opt.key}
                    index={i}
                    active={active}
                    bg={opt.bg}
                    accent={opt.accent}
                    subColor={opt.subColor}
                    label={opt.label}
                    sub={opt.sub}
                    image={opt.image}
                    onClick={() => {
                      setAttitude(opt.key);
                      setTimeout(() => setStep("resultado"), 320);
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
                  {isBox(resultado.main) ? (
                    // Cajas: no se agregan directo. Hay que armarlas (elegir
                    // sabores/ingredientes). Botón lleva a armar + aviso claro.
                    (() => {
                      const esRollin = resultado.main.category === "rollinbox";
                      const detalle = esRollin
                        ? "tus 4 sabores"
                        : "los ingredientes que la componen";
                      return (
                        <>
                          <button
                            onClick={onAdd}
                            disabled={avisoCaja}
                            className="w-full bg-antojo text-white rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg disabled:opacity-70"
                          >
                            Elegir y armar <IconArrowRight size={16} />
                          </button>
                          {avisoCaja ? (
                            <p className="text-[12px] text-antojo font-bold leading-snug px-1 fade-up">
                              Antes de agregarla tienes que elegir {detalle} 🤎
                              Te llevo a armarla…
                            </p>
                          ) : (
                            <p className="text-[11px] text-canela italic leading-snug px-1">
                              Esta caja se arma a tu gusto: elige {detalle} antes
                              de completar el pedido.
                            </p>
                          )}
                        </>
                      );
                    })()
                  ) : (
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
                  )}
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
 * Card de opción simple. La imagen vive DENTRO del card, no desbordando.
 * Padding generoso, layout flex column, imagen arriba — texto abajo.
 * Sin trucos de posición absoluta ni scales raros.
 */
function OptionCard({
  active,
  bg,
  accent,
  subColor,
  label,
  sub,
  image,
  index,
  onClick,
}: {
  active: boolean;
  bg: string;
  accent: string;
  subColor: string;
  label: string;
  sub?: string;
  image: string;
  index: number;
  onClick: () => void;
}) {
  // Sombras profundas para que el card oscuro se sienta elevado.
  const shadowDeep = "rgba(0,0,0,0.35)";
  return (
    <button
      onClick={onClick}
      className={`option-card relative px-3 pt-3 pb-3 rounded-3xl flex flex-col items-center text-center gap-1 ${
        active ? "is-active" : ""
      }`}
      style={{
        background: bg,
        animationDelay: `${index * 70}ms`,
        boxShadow: active
          ? `0 18px 36px ${shadowDeep}, 0 0 0 3px ${accent}, inset 0 -3px 12px rgba(0,0,0,0.25), inset 0 2px 0 rgba(255,255,255,0.18)`
          : `0 12px 26px ${shadowDeep}, inset 0 -3px 12px rgba(0,0,0,0.2), inset 0 2px 0 rgba(255,255,255,0.18)`,
      }}
    >
      <div className="w-full aspect-square relative">
        <Image
          src={image}
          alt={label}
          fill
          sizes="160px"
          className="object-contain drop-shadow-2xl"
        />
      </div>

      <div
        className="text-base font-bold leading-tight px-1"
        style={{ fontFamily: "Termina", color: accent }}
      >
        {label}
      </div>
      {sub && (
        <div
          className="text-[11px] leading-tight px-1"
          style={{ color: subColor }}
        >
          {sub}
        </div>
      )}
    </button>
  );
}

/**
 * Card de actitud para Step 3.
 * Layout horizontal limpio: imagen pequeña a la izquierda, texto a la
 * derecha. Sin Miga "desbordando", sin formas raras, sin aire vacío.
 * El card tiene altura compacta — solo lo necesario.
 */
function AttitudeCard({
  active,
  bg,
  accent,
  subColor,
  label,
  sub,
  image,
  index,
  onClick,
}: {
  active: boolean;
  bg: string;
  accent: string;
  subColor: string;
  label: string;
  sub: string;
  image: string;
  index: number;
  onClick: () => void;
}) {
  const shadowDeep = "rgba(0,0,0,0.35)";
  return (
    <button
      onClick={onClick}
      className={`option-card relative rounded-3xl flex items-center gap-3 px-4 py-5 ${
        active ? "is-active" : ""
      }`}
      style={{
        background: bg,
        animationDelay: `${index * 70}ms`,
        boxShadow: active
          ? `0 18px 36px ${shadowDeep}, 0 0 0 3px ${accent}, inset 0 -3px 12px rgba(0,0,0,0.25), inset 0 2px 0 rgba(255,255,255,0.18)`
          : `0 12px 26px ${shadowDeep}, inset 0 -3px 12px rgba(0,0,0,0.2), inset 0 2px 0 rgba(255,255,255,0.18)`,
      }}
    >
      {/* Imagen directa, sin círculo. Las PNG ya están recortadas
          transparentes; van limpias sobre el card oscuro. Más grande
          aprovechando que el card creció en altura. */}
      <div className="w-32 h-32 relative flex-shrink-0">
        <Image
          src={image}
          alt={label}
          fill
          sizes="128px"
          className="object-contain drop-shadow-2xl"
        />
      </div>

      <div className="flex-1 text-left">
        <div
          className="text-xl font-bold leading-tight"
          style={{ fontFamily: "Termina", color: accent }}
        >
          {label}
        </div>
        <div
          className="text-sm mt-1"
          style={{ color: subColor }}
        >
          {sub}
        </div>
      </div>

      <IconArrowRight
        size={20}
        style={{ color: accent, opacity: 0.8 }}
        className="flex-shrink-0"
      />
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
