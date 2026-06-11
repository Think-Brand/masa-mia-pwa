"use client";

import { useMemo, useState } from "react";
import {
  IconCheck,
  IconLoader2,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { Ingredient, ProductLite, Recipe, fmtMoney } from "./types";

type Row = {
  key: string;
  ingredient_id: string;
  quantity: string; // texto mientras se edita
};

let rowKey = 0;
const nextKey = () => `row-${++rowKey}`;

export default function RecetaEditor({
  product,
  recipe,
  ingredients,
  onClose,
  onSaved,
}: {
  product: ProductLite;
  recipe: Recipe | null;
  ingredients: Ingredient[];
  onClose: () => void;
  onSaved: (r: Recipe) => void;
}) {
  const [yieldQty, setYieldQty] = useState(
    String(recipe?.yield_qty ?? 1)
  );
  const [notes, setNotes] = useState(recipe?.notes ?? "");
  const [rows, setRows] = useState<Row[]>(
    (recipe?.recipe_items ?? [])
      .filter((it) => it.ingredient_id)
      .map((it) => ({
        key: nextKey(),
        ingredient_id: it.ingredient_id as string,
        quantity: String(it.quantity),
      }))
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ingMap = useMemo(
    () => new Map(ingredients.map((i) => [i.id, i])),
    [ingredients]
  );

  const totalCost = rows.reduce((sum, r) => {
    const ing = ingMap.get(r.ingredient_id);
    const q = parseFloat(r.quantity);
    if (!ing || isNaN(q)) return sum;
    return sum + q * ing.unit_cost;
  }, 0);
  const nYield = Math.max(1, parseInt(yieldQty, 10) || 1);
  const perPiece = totalCost / nYield;
  const foodCost = product.price > 0 ? (perPiece / product.price) * 100 : null;

  const addRow = () => {
    const firstFree = ingredients.find(
      (i) => !rows.some((r) => r.ingredient_id === i.id)
    );
    if (!firstFree) return;
    setRows((curr) => [
      ...curr,
      { key: nextKey(), ingredient_id: firstFree.id, quantity: "" },
    ]);
  };

  const guardar = async () => {
    const items = rows
      .map((r) => ({
        ingredient_id: r.ingredient_id,
        quantity: parseFloat(r.quantity),
      }))
      .filter((it) => !isNaN(it.quantity) && it.quantity > 0);
    if (items.length === 0) {
      setError("Agrega al menos un ingrediente con cantidad.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      let recipeId = recipe?.id;

      if (recipeId) {
        const { error: err } = await supabase
          .from("recipes")
          .update({
            yield_qty: nYield,
            notes: notes.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", recipeId);
        if (err) throw err;
        // Re-capturamos items completos: borrar y reinsertar (escala chica)
        const { error: delErr } = await supabase
          .from("recipe_items")
          .delete()
          .eq("recipe_id", recipeId);
        if (delErr) throw delErr;
      } else {
        const { data, error: err } = await supabase
          .from("recipes")
          .insert({
            product_id: product.id,
            yield_qty: nYield,
            notes: notes.trim() || null,
          })
          .select("id")
          .single();
        if (err) throw err;
        recipeId = data.id as string;
      }

      const { data: inserted, error: insErr } = await supabase
        .from("recipe_items")
        .insert(items.map((it) => ({ ...it, recipe_id: recipeId })))
        .select("id, ingredient_id, quantity");
      if (insErr) throw insErr;

      onSaved({
        id: recipeId!,
        product_id: product.id,
        yield_qty: nYield,
        notes: notes.trim() || null,
        recipe_items: (inserted ?? []).map((it) => ({
          id: it.id,
          ingredient_id: it.ingredient_id,
          quantity: Number(it.quantity),
        })),
      });
    } catch (e) {
      console.error(e);
      setError("No se pudo guardar la receta. Intenta de nuevo.");
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-cafe/70 backdrop-blur-md flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-crema rounded-t-3xl sm:rounded-3xl p-5 pb-8 shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2
              className="text-2xl text-cafe leading-tight"
              style={{ fontFamily: "ReginaBlack" }}
            >
              {product.emoji || "🥐"} {product.name}
            </h2>
            <p className="text-xs text-canela">
              Precio de venta: {fmtMoney(product.price)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-canela p-1"
            aria-label="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Rendimiento */}
        <div className="bg-white rounded-2xl p-3 mb-3 flex items-center justify-between">
          <span className="text-sm text-cafe font-semibold">
            Esta receta rinde
          </span>
          <div className="flex items-center gap-2">
            <input
              value={yieldQty}
              onChange={(e) => setYieldQty(e.target.value)}
              inputMode="numeric"
              className="w-16 bg-crema-soft rounded-xl px-2 py-2 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-antojo/30"
            />
            <span className="text-sm text-canela">pzas</span>
          </div>
        </div>

        {/* Ingredientes */}
        <div className="flex flex-col gap-2 mb-3">
          {rows.map((r) => {
            const ing = ingMap.get(r.ingredient_id);
            return (
              <div
                key={r.key}
                className="bg-white rounded-2xl p-2.5 flex items-center gap-2"
              >
                <select
                  value={r.ingredient_id}
                  onChange={(e) =>
                    setRows((curr) =>
                      curr.map((x) =>
                        x.key === r.key
                          ? { ...x, ingredient_id: e.target.value }
                          : x
                      )
                    )
                  }
                  className="flex-1 min-w-0 bg-crema-soft rounded-xl px-2 py-2 text-sm focus:outline-none"
                >
                  {ingredients.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
                <input
                  value={r.quantity}
                  onChange={(e) =>
                    setRows((curr) =>
                      curr.map((x) =>
                        x.key === r.key
                          ? { ...x, quantity: e.target.value }
                          : x
                      )
                    )
                  }
                  inputMode="decimal"
                  placeholder="0"
                  className="w-16 bg-crema-soft rounded-xl px-2 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-antojo/30"
                />
                <span className="text-xs text-canela w-7 flex-shrink-0">
                  {ing?.unit ?? ""}
                </span>
                <button
                  onClick={() =>
                    setRows((curr) => curr.filter((x) => x.key !== r.key))
                  }
                  className="text-rojo/70 p-1 flex-shrink-0"
                  aria-label="Quitar ingrediente"
                >
                  <IconTrash size={16} />
                </button>
              </div>
            );
          })}

          <button
            onClick={addRow}
            disabled={ingredients.length === 0}
            className="flex items-center justify-center gap-1.5 border-2 border-dashed border-caramelo/40 text-canela rounded-2xl py-2.5 text-sm font-semibold active:scale-[0.99] transition disabled:opacity-50"
          >
            <IconPlus size={16} />
            Ingrediente
          </button>
          {ingredients.length === 0 && (
            <p className="text-xs text-canela-soft text-center">
              Primero captura ingredientes en su pestaña.
            </p>
          )}
        </div>

        {/* Notas */}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas (horno, tiempos, tips…)"
          rows={2}
          className="w-full bg-white rounded-2xl px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-antojo/30"
        />

        {/* Resumen de costo */}
        {rows.length > 0 && (
          <div className="bg-cafe text-crema rounded-2xl p-4 mb-3">
            <div className="flex justify-between text-sm">
              <span>Costo de la tanda</span>
              <b>{fmtMoney(totalCost)}</b>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span>Costo por pieza ({nYield} pzas)</span>
              <b>{fmtMoney(perPiece)}</b>
            </div>
            {foodCost !== null && (
              <div className="flex justify-between text-sm mt-1">
                <span>Costo vs precio de venta</span>
                <b
                  className={
                    foodCost <= 35
                      ? "text-[#9FE26F]"
                      : foodCost <= 50
                        ? "text-[#FFB35C]"
                        : "text-[#FF8C7A]"
                  }
                >
                  {Math.round(foodCost)}%
                </b>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-rojo text-xs mb-2">{error}</p>}

        <button
          onClick={guardar}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 bg-verde text-white rounded-2xl py-3 font-semibold active:scale-[0.99] transition disabled:opacity-60"
        >
          {busy ? (
            <IconLoader2 size={18} className="animate-spin" />
          ) : (
            <IconCheck size={18} />
          )}
          Guardar receta
        </button>
      </div>
    </div>
  );
}
