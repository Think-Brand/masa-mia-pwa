"use client";

import Image from "next/image";
import { useState } from "react";
import { pickMiga, type MigaEmocion } from "@/lib/migaEmotions";

export type MigaPose =
  // Set original (archivos con prefijo miga-)
  | "adorable"
  | "algo-entre-manos"
  | "chef"
  | "cintura"
  | "espalda"
  | "lista"
  | "malabares"
  | "senalar"
  | "sentada"
  | "tierna"
  // Set nuevo (archivos sin prefijo)
  | "agradecida"
  | "atareada"
  | "chill"
  | "confundida"
  | "culpable"
  | "dormida"
  | "drama"
  | "lo-siento"
  | "master-chef"
  | "sorprendida"
  | "una-idea"
  | "vacaciones-1"
  | "vacaciones-2";

// Mapa pose → archivo real. Necesario porque algunos archivos nuevos no
// llevan el prefijo "miga-" y "master chef.png" tiene espacio en el nombre.
const POSE_FILE: Record<MigaPose, string> = {
  adorable: "miga-adorable.png",
  "algo-entre-manos": "miga-algo-entre-manos.png",
  chef: "miga-chef.png",
  cintura: "miga-cintura.png",
  espalda: "miga-espalda.png",
  lista: "miga-lista.png",
  malabares: "miga-malabares.png",
  senalar: "miga-senalar.png",
  sentada: "miga-sentada.png",
  tierna: "miga-tierna.png",
  agradecida: "agradecida.png",
  atareada: "atareada.png",
  chill: "chill.png",
  confundida: "condundida.png", // typo en archivo subido
  culpable: "culpable.png",
  dormida: "dormida.png",
  drama: "drama.png",
  "lo-siento": "lo-siento.png",
  "master-chef": "master chef.png", // espacio en filename
  sorprendida: "sorprendida.png",
  "una-idea": "una-idea.png",
  "vacaciones-1": "vacaciones-1.png",
  "vacaciones-2": "vacaciones-2.png",
};

export type MigaAnim =
  | "bounce"
  | "sway"
  | "float"
  | "pop"
  | "jump"
  | "wiggle"
  | "shake"
  | "breath"
  | "stir"
  | "none";

// Frases en voz de Miga (comensal noble que finge ser chef, NO chef)
const FRASES_ALEATORIAS = [
  "Donde come uno, compran dos.",
  "Compartir sí. Mi rol, no.",
  "Uno nunca es uno.",
  "Guarda uno… ajá.",
  "¿Dieta? Qué linda historia.",
  "Dijo que no. Pero si quieres uno.",
  "Hey, para. No soy botón.",
  "Ey, suave. Sí siento.",
  "Yo te ayudo, pero tampoco hago milagros.",
  "Yo no juzgo… en voz alta.",
  "Déjame pensar, tengo masa en la cabeza.",
];

type Props = {
  /** Pose específica (legacy + nuevas) */
  pose?: MigaPose;
  /** Emoción de alto nivel — usa pickMiga() y rota variantes */
  emocion?: MigaEmocion;
  /** Seed para que el variant sea determinístico (ej. folio del pedido) */
  seed?: string | number;
  animation?: MigaAnim;
  size?: number;
  className?: string;
  priority?: boolean;
  interactive?: boolean;
};

export default function Miga({
  pose,
  emocion,
  seed,
  animation = "bounce",
  size = 140,
  className = "",
  priority = false,
  interactive = true,
}: Props) {
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [wiggleKey, setWiggleKey] = useState(0);

  const animClass = animation === "none" ? "" : `anim-${animation}`;

  // Fuente: si pasan emocion, usa pickMiga (con rotación de variantes).
  // Si pasan pose, busca en POSE_FILE. Fallback: adorable.
  const src = emocion
    ? pickMiga(emocion, seed)
    : pose
      ? `/mascota/${POSE_FILE[pose] ?? "miga-adorable.png"}`
      : "/mascota/miga-adorable.png";

  function handleClick() {
    if (!interactive) return;
    const frase = FRASES_ALEATORIAS[Math.floor(Math.random() * FRASES_ALEATORIAS.length)];
    setTooltip(frase);
    setWiggleKey((k) => k + 1);
    setTimeout(() => setTooltip(null), 2500);
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        key={wiggleKey}
        className={`${animClass} ${interactive ? "miga-clickable" : ""} ${wiggleKey > 0 ? "anim-wiggle" : ""}`}
        onClick={handleClick}
      >
        <Image
          src={src}
          alt="Miga"
          width={size}
          height={size}
          priority={priority}
          style={{ width: size, height: "auto", display: "block" }}
        />
      </div>
      {tooltip && (
        <div
          className="absolute left-1/2 -translate-x-1/2 bg-cafe text-crema px-3.5 py-2 rounded-xl text-xs font-medium shadow-lg fade-up text-center"
          style={{
            fontFamily: "Termina",
            bottom: "calc(100% + 12px)",
            maxWidth: "min(220px, calc(100vw - 32px))",
            lineHeight: 1.35,
          }}
        >
          {tooltip}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-0 h-0"
            style={{
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid var(--cafe)",
            }}
          />
        </div>
      )}
    </div>
  );
}
