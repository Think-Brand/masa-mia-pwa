"use client";

import Miga from "./Miga";

/**
 * Loading state con personalidad. En lugar de "Cargando…" plano, Miga
 * aparece amasando (stir animation) con una frase corta que rota.
 *
 * Uso:
 *   <MigaLoading />                       // default frase y tamaño
 *   <MigaLoading frase="Sirviendo…" />   // frase custom
 *   <MigaLoading size={140} />            // ajustar tamaño
 *   <MigaLoading inline />                // pequeño y horizontal
 */

const FRASES_AMASANDO = [
  "Amasando…",
  "Sacando del horno…",
  "Buscando en la masa…",
  "Calentando el horno…",
  "Probando el sabor…",
];

type Props = {
  /** Frase debajo. Si no se da, rota una al azar */
  frase?: string;
  /** Tamaño de Miga. Default 160 (empty state). 80 para inline. */
  size?: number;
  /** Versión chiquita horizontal (para barras / inline) */
  inline?: boolean;
};

export default function MigaLoading({
  frase,
  size = 160,
  inline = false,
}: Props) {
  const fraseFinal =
    frase ?? FRASES_AMASANDO[Math.floor(Math.random() * FRASES_AMASANDO.length)];

  if (inline) {
    return (
      <div className="flex items-center gap-2 text-canela text-xs">
        <Miga
          emocion="ocupada"
          animation="stir"
          size={28}
          interactive={false}
        />
        <span className="italic">{fraseFinal}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center py-10 gap-3">
      <Miga
        emocion="ocupada"
        animation="stir"
        size={size}
        interactive={false}
      />
      <p
        className="text-canela text-xs italic"
        style={{ fontFamily: "Termina" }}
      >
        {fraseFinal}
      </p>
    </div>
  );
}
