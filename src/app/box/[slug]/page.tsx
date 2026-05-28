"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconArrowLeft,
  IconCheck,
  IconMinus,
  IconPlus,
  IconShoppingBag,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import {
  Product,
  BoxComponent,
  ComponentOption,
} from "@/lib/types";
import {
  CompositionLine,
  useCarrito,
} from "@/components/CarritoProvider";
import BottomNav from "@/components/BottomNav";

function transparentVariant(url: string | null): string | null {
  if (!url) return null;
  return url.replace("/full-color/", "/png/");
}

type ComponentWithOptions = {
  component: BoxComponent;
  // Selecciones del cliente: nombre de opción → cantidad
  selections: Record<string, number>;
  // Opciones disponibles (puede venir de component_options o de products)
  options: Array<{
    name: string;
    image_url: string | null;
    price_modifier: number;
  }>;
};

export default function BoxPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-canela text-sm">
          Cargando…
        </div>
      }
    >
      <BoxConstructor />
    </Suspense>
  );
}

function BoxConstructor() {
  const router = useRouter();
  const params = useSearchParams();
  const { addBox } = useCarrito();
  const boxId = params.get("id");

  const [box, setBox] = useState<Product | null>(null);
  const [comps, setComps] = useState<ComponentWithOptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!boxId) {
      router.replace("/catalogo");
      return;
    }
    (async () => {
      const supabase = createClient();
      // 1. Box
      const { data: boxData } = await supabase
        .from("products")
        .select("*")
        .eq("id", boxId)
        .single();
      if (!boxData) {
        router.replace("/catalogo");
        return;
      }
      setBox(boxData as Product);

      // 2. Componentes activos
      const { data: components } = await supabase
        .from("box_components")
        .select("*")
        .eq("box_product_id", boxId)
        .eq("is_active", true)
        .order("sort_order");

      if (!components || components.length === 0) {
        setComps([]);
        setLoading(false);
        return;
      }

      // 3. Opciones por componente
      const compIds = components.map((c: BoxComponent) => c.id);
      const { data: options } = await supabase
        .from("component_options")
        .select("*")
        .in("component_id", compIds)
        .eq("is_available", true)
        .order("sort_order");

      // 4. Si tiene category_filter, traer productos
      const categories = Array.from(
        new Set(
          components
            .map((c: BoxComponent) => c.category_filter)
            .filter(Boolean) as string[]
        )
      );
      let productsByCat: Record<string, Product[]> = {};
      if (categories.length > 0) {
        const { data: prods } = await supabase
          .from("products")
          .select("*")
          .in("category", categories)
          .eq("is_public", true)
          .eq("is_active", true)
          .order("sort_order");
        productsByCat = (prods ?? []).reduce(
          (acc: Record<string, Product[]>, p: Product) => {
            acc[p.category] = acc[p.category] || [];
            acc[p.category].push(p);
            return acc;
          },
          {}
        );
      }

      const compsWithOpts: ComponentWithOptions[] = (components as BoxComponent[]).map(
        (c) => {
          const compOptions = (options as ComponentOption[] | null)?.filter(
            (o) => o.component_id === c.id
          );

          let opts: ComponentWithOptions["options"] = [];

          if (compOptions && compOptions.length > 0) {
            // Tiene opciones cargadas en BD
            opts = compOptions.map((o) => ({
              name: o.name,
              image_url: null,
              price_modifier: Number(o.price_modifier) || 0,
            }));
          } else if (c.category_filter && productsByCat[c.category_filter]) {
            // Usa productos de cierta categoría
            opts = productsByCat[c.category_filter].map((p) => ({
              name: p.name,
              image_url: p.image_url,
              price_modifier: 0,
            }));
          }

          return {
            component: c,
            selections: {},
            options: opts,
          };
        }
      );

      setComps(compsWithOpts);
      setLoading(false);
    })();
  }, [boxId, router]);

  // Helpers para selecciones
  const updateQty = (compIdx: number, optName: string, delta: number) => {
    setComps((curr) => {
      const next = [...curr];
      const c = { ...next[compIdx] };
      const sel = { ...c.selections };
      const current = sel[optName] ?? 0;
      const newQty = current + delta;
      const totalSelected = Object.values(sel).reduce((s, n) => s + n, 0);
      const required = c.component.quantity;

      // Validar límites
      if (newQty < 0) return curr;
      if (delta > 0 && totalSelected >= required) return curr;
      if (
        !c.component.allow_repeat &&
        newQty > 1 &&
        delta > 0
      ) {
        return curr;
      }

      if (newQty === 0) delete sel[optName];
      else sel[optName] = newQty;

      c.selections = sel;
      next[compIdx] = c;
      return next;
    });
  };

  // Calcular precio extra y validación
  const { extraPrice, allComplete } = useMemo(() => {
    let extra = 0;
    let complete = true;
    for (const c of comps) {
      const selectedTotal = Object.values(c.selections).reduce(
        (s, n) => s + n,
        0
      );
      if (c.options.length > 0 && selectedTotal !== c.component.quantity) {
        complete = false;
      }
      for (const [name, qty] of Object.entries(c.selections)) {
        const opt = c.options.find((o) => o.name === name);
        if (opt) extra += opt.price_modifier * qty;
      }
    }
    return { extraPrice: extra, allComplete: complete };
  }, [comps]);

  const total = (box ? Number(box.price) : 0) + extraPrice;

  const onAdd = () => {
    if (!box || !allComplete) return;
    const composition: CompositionLine[] = comps.map((c) => ({
      componentName: c.component.name,
      selections:
        c.options.length === 0
          ? [{ name: "Incluido", quantity: c.component.quantity }]
          : Object.entries(c.selections).map(([name, quantity]) => ({
              name,
              quantity,
            })),
    }));
    addBox(box, composition, total);
    setAdded(true);
    setTimeout(() => router.push("/carrito"), 700);
  };

  if (loading || !box) {
    return (
      <div className="min-h-screen flex items-center justify-center text-canela text-sm">
        Armando tu caja…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-[var(--avellana-soft)] pb-44">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--avellana-soft)]/95 backdrop-blur flex items-center justify-between px-4 py-3 border-b border-caramelo/20">
        <button
          onClick={() => router.back()}
          aria-label="Atrás"
          className="text-cafe"
        >
          <IconArrowLeft size={20} />
        </button>
        <div
          className="text-xl text-cafe text-center flex-1"
          style={{ fontFamily: "ReginaBlack" }}
        >
          Arma tu {box.name.replace(/\s+\d+$/, "")}
        </div>
        <div className="w-5" />
      </header>

      {/* Imagen + descripción */}
      <div className="px-4 pt-4">
        {box.image_url && (
          <Image
            src={box.image_url}
            alt={box.name}
            width={500}
            height={500}
            className="w-full aspect-[2/1] object-cover rounded-2xl"
            priority
          />
        )}
        {box.description && (
          <p className="text-xs text-cafe mt-3 leading-relaxed">
            {box.description}
          </p>
        )}
      </div>

      {/* Componentes */}
      <div className="px-4 pt-4 flex flex-col gap-4">
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
                    <div className="text-[10px] text-canela">
                      {c.component.description}
                    </div>
                  )}
                </div>
                {isFixed ? (
                  <div className="text-[10px] bg-crema text-cafe rounded-full px-2 py-0.5 font-bold">
                    × {c.component.quantity} incluido
                  </div>
                ) : (
                  <div
                    className={`text-[10px] rounded-full px-2 py-0.5 font-bold ${
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
                  {c.options.map((opt) => {
                    const pngUrl = transparentVariant(opt.image_url);
                    const qty = c.selections[opt.name] ?? 0;
                    return (
                      <div
                        key={opt.name}
                        className={`relative bg-gradient-to-br from-canela to-cafe rounded-xl p-2 flex flex-col items-center transition ${
                          qty > 0 ? "ring-2 ring-antojo shadow-md" : ""
                        }`}
                      >
                        {pngUrl ? (
                          <Image
                            src={pngUrl}
                            alt={opt.name}
                            width={160}
                            height={160}
                            className="w-full aspect-square object-contain drop-shadow"
                          />
                        ) : (
                          <div className="w-full aspect-square flex items-center justify-center text-2xl">
                            🍩
                          </div>
                        )}
                        <div
                          className="text-[10px] font-bold text-crema text-center mt-1"
                          style={{ fontFamily: "Termina" }}
                        >
                          {opt.name}
                        </div>
                        {opt.price_modifier > 0 && (
                          <div className="text-[9px] text-caramelo">
                            +${opt.price_modifier.toFixed(0)}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 bg-cafe/80 rounded-full px-1.5 py-0.5 mt-1.5">
                          <button
                            onClick={() => updateQty(idx, opt.name, -1)}
                            disabled={qty === 0}
                            className="text-crema active:scale-90 disabled:opacity-30"
                          >
                            <IconMinus size={12} />
                          </button>
                          <span className="text-[10px] font-bold w-3 text-center text-crema">
                            {qty}
                          </span>
                          <button
                            onClick={() => updateQty(idx, opt.name, 1)}
                            disabled={totalSelected >= c.component.quantity}
                            className="text-crema active:scale-90 disabled:opacity-30"
                          >
                            <IconPlus size={12} />
                          </button>
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

      {/* Footer total + botón (sobre el bottom nav) */}
      <div className="fixed bottom-[68px] left-0 right-0 max-w-md mx-auto p-3 bg-gradient-to-t from-[var(--avellana-soft)] via-[var(--avellana-soft)] to-transparent">
        <div className="bg-cafe rounded-2xl p-3 flex items-center justify-between mb-2 text-crema">
          <span className="text-xs">Total</span>
          <span
            className="text-xl"
            style={{ fontFamily: "ReginaBlack" }}
          >
            ${total.toFixed(0)}
          </span>
        </div>
        <button
          onClick={onAdd}
          disabled={!allComplete || added}
          className="w-full bg-antojo text-white rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg disabled:opacity-50"
        >
          {added ? (
            <>
              <IconCheck size={16} /> ¡Listo!
            </>
          ) : !allComplete ? (
            <>Falta escoger {comps.reduce((s, c) => {
              if (c.options.length === 0) return s;
              const sel = Object.values(c.selections).reduce((a, b) => a + b, 0);
              return s + (c.component.quantity - sel);
            }, 0)}</>
          ) : (
            <>
              Agregar al pedido <IconShoppingBag size={16} />
            </>
          )}
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
