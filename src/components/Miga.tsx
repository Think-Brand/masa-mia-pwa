"use client";

import Image from "next/image";
import { useState } from "react";

export type MigaPose =
  | "adorable"
  | "algo-entre-manos"
  | "chef"
  | "cintura"
  | "espalda"
  | "lista"
  | "malabares"
  | "senalar"
  | "sentada"
  | "tierna";

export type MigaAnim =
  | "bounce"
  | "sway"
  | "float"
  | "pop"
  | "jump"
  | "none";

// Frases en voz de Miga (comensal noble, NO chef)
const FRASES_ALEATORIAS = [
  "Ay, no me piques. No soy botón.",
  "Yo no horneo, yo solo huelo.",
  "Las verdaderas magas son Fabi y Alex.",
  "Soy comensal con uniforme prestado.",
  "Hoy traigo el batidor por accidente.",
  "Mírame con cariño, no con receta.",
];

type Props = {
  pose: MigaPose;
  animation?: MigaAnim;
  size?: number;
  className?: string;
  priority?: boolean;
  interactive?: boolean;
};

export default function Miga({
  pose,
  animation = "bounce",
  size = 140,
  className = "",
  priority = false,
  interactive = true,
}: Props) {
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [wiggleKey, setWiggleKey] = useState(0);

  const animClass = animation === "none" ? "" : `anim-${animation}`;

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
          src={`/mascota/miga-${pose}.png`}
          alt={`Miga — pose ${pose}`}
          width={size}
          height={size}
          priority={priority}
          style={{ width: size, height: "auto", display: "block" }}
        />
      </div>
      {tooltip && (
        <div
          className="absolute -top-12 left-1/2 -translate-x-1/2 bg-cafe text-crema px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shadow-lg fade-up"
          style={{ fontFamily: "Termina" }}
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
