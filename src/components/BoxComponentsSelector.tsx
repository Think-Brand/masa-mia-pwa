"use client";

import Image from "next/image";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { ComponentWithOptions } from "@/components/useBoxBuilder";

// Paleta de fondos cálidos para opciones sin imagen (mini pays, gomitas, etc.)
const FONDOS_OPCIONES = [
  "from-[#F8E4C5] to-[#F2C994]", // crema → durazno
  "from-[#FCEED1] to-[#FFC97A]", // amarillo cálido
  "from-[#F6D5C6] to-[#F4B89B]", // melocotón
  "from-[#FCE4D8] to-[#E89F6D]", // canela suave
  "from-[#E8D7C0] to-[#C9956C]", // caramelo
  "from-[#F5DAC1] to-[#E0A574]", // miel
];

/**
 * Render de los componentes de una box con sus selectores de cantidad.
 * Presentacional: recibe los comps y el updateQty del hook useBoxBuilder.
 * Se usa en la página /box/[slug] y en el modal de "armar otra".
 */
export default function BoxComponentsSelector({
  comps,
  updateQty,
}: {
  comps: ComponentWithOptions[];
  updateQty: (compIdx: number, optName: string, delta: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {comps.map((c, idx) => {
        const totalSelected = Object.values(c.selections).reduce(
          (s, n) => s + n,
          0
        );
        const completo = totalSelected === c.component.quantity;
        const isFixed = c.options.length === 0;

        return (
          <section key={c.component.id} className="bg-white rounded-2xl p-3">
            <div className="flex items-center justify-between mb-1">
              <div>
                <div
                  className="text-sm font-bold text-cafe"
                  style={{ fontFamily: "Termina" }}
                >
                  {c.component.name}
                </div>
                {c.component.description && (
                  <div className="text-[11px] text-canela">
                    {c.component.description}
                  </div>
                )}
              </div>
              {isFixed ? (
                <div className="text-[11px] bg-crema text-cafe rounded-full px-2 py-0.5 font-bold">
                  × {c.component.quantity} incluido
                </div>
              ) : (
                <div
                  className={`text-[11px] rounded-full px-2 py-0.5 font-bold ${
                    completo
                      ? "bg-verde text-white"
                      : "bg-canela/20 text-canela"
                  }`}
                >
                  {totalSelected} / {c.component.quantity}
                </div>
              )}
            </div>

            {/* Opciones con selector */}
            {!isFixed && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {c.options.map((opt, optIdx) => {
                  const fullColorUrl = opt.image_url;
                  const qty = c.selections[opt.name] ?? 0;
                  const fondo =
                    FONDOS_OPCIONES[optIdx % FONDOS_OPCIONES.length];
                  return (
                    <div
                      key={opt.name}
                      className={`relative rounded-xl overflow-hidden transition ${
                        qty > 0
                          ? "ring-2 ring-antojo shadow-lg"
                          : "shadow-sm"
                      }`}
                    >
                      {fullColorUrl ? (
                        <div className="relative">
                          <Image
                            src={fullColorUrl}
                            alt={opt.name}
                            width={300}
                            height={300}
                            className="w-full aspect-square object-cover"
                          />
                          {qty > 0 && (
                            <span className="absolute top-1 left-1 bg-antojo text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
                              {qty}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div
                          className={`relative w-full aspect-square bg-gradient-to-br ${fondo} flex items-center justify-center`}
                        >
                          <span
                            className="text-cafe text-center px-2 leading-tight"
                            style={{
                              fontFamily: "ReginaBlack",
                              fontSize: 18,
                            }}
                          >
                            {opt.name}
                          </span>
                          {qty > 0 && (
                            <span className="absolute top-1 left-1 bg-antojo text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
                              {qty}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="bg-white p-1.5">
                        {fullColorUrl && (
                          <div
                            className="text-[11px] font-bold text-cafe text-center truncate"
                            style={{ fontFamily: "Termina" }}
                          >
                            {opt.name}
                          </div>
                        )}
                        {opt.price_modifier > 0 && (
                          <div className="text-[11px] text-antojo text-center">
                            +${opt.price_modifier.toFixed(0)}
                          </div>
                        )}
                        <div className="flex items-center justify-center gap-2 bg-crema rounded-full px-2 py-1 mt-1.5">
                          <button
                            onClick={() => updateQty(idx, opt.name, -1)}
                            disabled={qty === 0}
                            aria-label="Quitar uno"
                            className="text-cafe active:scale-90 disabled:opacity-30 w-8 h-8 flex items-center justify-center rounded-full"
                          >
                            <IconMinus size={18} />
                          </button>
                          <span className="text-sm font-bold w-6 text-center text-cafe">
                            {qty}
                          </span>
                          <button
                            onClick={() => updateQty(idx, opt.name, 1)}
                            disabled={totalSelected >= c.component.quantity}
                            aria-label="Agregar uno"
                            className="text-cafe active:scale-90 disabled:opacity-30 w-8 h-8 flex items-center justify-center rounded-full"
                          >
                            <IconPlus size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Componente fijo (sin opciones todavía cargadas) */}
            {isFixed && (
              <div className="mt-1 text-[11px] text-canela italic">
                Viene incluido.
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
