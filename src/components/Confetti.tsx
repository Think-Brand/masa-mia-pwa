"use client";

import { useEffect, useState } from "react";

/**
 * Confetti burst — micro-celebración para momentos clave (confirmar
 * pedido, aceptar cortesía, primer pedido). 8 partículas pequeñas que
 * vuelan desde el centro hacia direcciones distintas con rotación y se
 * desvanecen. No usa libraries, no infinito, no caro.
 *
 * Uso:
 *   <Confetti trigger={confirmado} />
 *
 * El componente vive como overlay absolute encima de su padre relative.
 */

type Particle = {
  id: number;
  /** Color hex */
  color: string;
  /** Tamaño px */
  size: number;
  /** Translate X final */
  cx: number;
  /** Translate Y final (negativo = sube) */
  cy: number;
  /** Delay ms */
  delay: number;
};

const PALETA = [
  "#F25C20", // antojo principal
  "#FF8650", // antojo claro
  "#E04A18", // antojo oscuro
  "#F2A516", // amarillo masa
  "#F4E5CF", // crema
  "#FFF5DC", // crema clara
];

function buildParticles(seed: number): Particle[] {
  const out: Particle[] = [];
  const total = 14;
  for (let i = 0; i < total; i++) {
    const angle = (i / total) * Math.PI * 2; // distribución radial
    const distance = 60 + Math.random() * 50;
    out.push({
      id: seed * 100 + i,
      color: PALETA[Math.floor(Math.random() * PALETA.length)],
      size: 6 + Math.random() * 6,
      cx: Math.cos(angle) * distance,
      // Sesgo hacia arriba: los confetti naturalmente flotan
      cy: Math.sin(angle) * distance - 30 - Math.random() * 30,
      delay: i * 12,
    });
  }
  return out;
}

type Props = {
  /** Cambia este valor para disparar la celebración */
  trigger: number;
};

export default function Confetti({ trigger }: Props) {
  const [particles, setParticles] = useState<Particle[] | null>(null);

  useEffect(() => {
    if (trigger === 0) return;
    setParticles(buildParticles(trigger));
    const t = setTimeout(() => setParticles(null), 1300);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!particles) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-visible"
      aria-hidden="true"
    >
      <div className="absolute left-1/2 top-1/2">
        {particles.map((p) => (
          <span
            key={p.id}
            className="confetti-piece"
            style={
              {
                width: p.size,
                height: p.size * (Math.random() > 0.5 ? 1.4 : 0.6),
                background: p.color,
                animationDelay: `${p.delay}ms`,
                "--cx": `${p.cx}px`,
                "--cy": `${p.cy}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
