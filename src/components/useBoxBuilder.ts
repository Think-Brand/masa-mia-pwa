"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Product, BoxComponent, ComponentOption } from "@/lib/types";
import { CompositionLine } from "@/components/CarritoProvider";

export type ComponentWithOptions = {
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

/**
 * Hook compartido para armar una box (RollinBox / LuvinBox).
 * Lo usan tanto la página /box/[slug] como el modal de "armar otra".
 *
 * Centraliza: fetch de componentes + opciones, estado de selecciones,
 * validación, precio extra y serialización de la composición.
 */
export function useBoxBuilder(boxId: string | null) {
  const [box, setBox] = useState<Product | null>(null);
  const [comps, setComps] = useState<ComponentWithOptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!boxId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotFound(false);
    (async () => {
      const supabase = createClient();
      // 1. Box
      const { data: boxData } = await supabase
        .from("products")
        .select("*")
        .eq("id", boxId)
        .single();
      if (!alive) return;
      if (!boxData) {
        setNotFound(true);
        setLoading(false);
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

      if (!alive) return;
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

      const compsWithOpts: ComponentWithOptions[] = (
        components as BoxComponent[]
      ).map((c) => {
        const compOptions = (options as ComponentOption[] | null)?.filter(
          (o) => o.component_id === c.id
        );

        let opts: ComponentWithOptions["options"] = [];

        if (compOptions && compOptions.length > 0) {
          opts = compOptions.map((o) => ({
            name: o.name,
            image_url: o.image_url,
            price_modifier: Number(o.price_modifier) || 0,
          }));
        } else if (c.category_filter && productsByCat[c.category_filter]) {
          opts = productsByCat[c.category_filter].map((p) => ({
            name: p.name,
            image_url: p.image_url,
            price_modifier: 0,
          }));
        }

        return { component: c, selections: {}, options: opts };
      });

      if (!alive) return;
      setComps(compsWithOpts);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [boxId]);

  const updateQty = (compIdx: number, optName: string, delta: number) => {
    setComps((curr) => {
      const next = [...curr];
      const c = { ...next[compIdx] };
      const sel = { ...c.selections };
      const current = sel[optName] ?? 0;
      const newQty = current + delta;
      const totalSelected = Object.values(sel).reduce((s, n) => s + n, 0);
      const required = c.component.quantity;

      if (newQty < 0) return curr;
      if (delta > 0 && totalSelected >= required) return curr;
      if (!c.component.allow_repeat && newQty > 1 && delta > 0) {
        return curr;
      }

      if (newQty === 0) delete sel[optName];
      else sel[optName] = newQty;

      c.selections = sel;
      next[compIdx] = c;
      return next;
    });
  };

  // Reinicia todas las selecciones (para "armar otra" sin recargar).
  const reset = () => {
    setComps((curr) => curr.map((c) => ({ ...c, selections: {} })));
  };

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

  const missingCount = comps.reduce((s, c) => {
    if (c.options.length === 0) return s;
    const sel = Object.values(c.selections).reduce((a, b) => a + b, 0);
    return s + (c.component.quantity - sel);
  }, 0);

  const buildComposition = (): CompositionLine[] =>
    comps.map((c) => ({
      componentName: c.component.name,
      selections:
        c.options.length === 0
          ? [{ name: "Incluido", quantity: c.component.quantity }]
          : Object.entries(c.selections).map(([name, quantity]) => ({
              name,
              quantity,
            })),
    }));

  return {
    box,
    comps,
    loading,
    notFound,
    updateQty,
    reset,
    extraPrice,
    allComplete,
    total,
    missingCount,
    buildComposition,
  };
}
