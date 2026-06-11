"use client";

import { useState } from "react";
import {
  IconCheck,
  IconLoader2,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import { Ingredient, UNITS, fmtMoney } from "./types";

export default function IngredientesTab({
  ingredients,
  setIngredients,
  usedIngredientIds,
}: {
  ingredients: Ingredient[];
  setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  usedIngredientIds: Set<string>;
}) {
  const [openId, setOpenId] = useState<string | "new" | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {/* Agregar nuevo */}
      {openId === "new" ? (
        <IngredientForm
          onCancel={() => setOpenId(null)}
          onSaved={(ing) => {
            setIngredients((curr) =>
              [...curr, ing].sort((a, b) => a.name.localeCompare(b.name))
            );
            setOpenId(null);
          }}
        />
      ) : (
        <button
          onClick={() => setOpenId("new")}
          className="flex items-center justify-center gap-2 bg-cafe text-crema rounded-2xl py-3 font-semibold text-sm active:scale-[0.99] transition"
        >
          <IconPlus size={18} />
          Agregar ingrediente
        </button>
      )}

      {ingredients.length === 0 && openId !== "new" && (
        <div className="bg-avellana-soft rounded-2xl p-4 text-sm text-canela">
          Aquí van tus insumos con costo: harina, mantequilla, azúcar, cajas…
          Tip: usa unidades chicas (g, ml, pza) para que las recetas sean
          fáciles de capturar.
        </div>
      )}

      {ingredients.map((ing) =>
        openId === ing.id ? (
          <IngredientForm
            key={ing.id}
            existing={ing}
            canDelete={!usedIngredientIds.has(ing.id)}
            onCancel={() => setOpenId(null)}
            onSaved={(updated) => {
              setIngredients((curr) =>
                curr
                  .map((i) => (i.id === updated.id ? updated : i))
                  .sort((a, b) => a.name.localeCompare(b.name))
              );
              setOpenId(null);
            }}
            onDeleted={(id) => {
              setIngredients((curr) => curr.filter((i) => i.id !== id));
              setOpenId(null);
            }}
          />
        ) : (
          <button
            key={ing.id}
            onClick={() => setOpenId(ing.id)}
            className="bg-white rounded-2xl p-3 shadow-sm active:scale-[0.99] transition flex items-center gap-3 text-left"
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-cafe truncate">
                {ing.name}
                {ing.is_estimated && (
                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-antojo/15 text-antojo px-1.5 py-0.5 rounded-full">
                    estimado
                  </span>
                )}
              </p>
              <p className="text-xs text-canela">
                {fmtMoney(ing.unit_cost)} por {ing.unit}
                {ing.supplier ? ` · ${ing.supplier}` : ""}
              </p>
            </div>
          </button>
        )
      )}
    </div>
  );
}

function IngredientForm({
  existing,
  canDelete,
  onSaved,
  onCancel,
  onDeleted,
}: {
  existing?: Ingredient;
  canDelete?: boolean;
  onSaved: (ing: Ingredient) => void;
  onCancel: () => void;
  onDeleted?: (id: string) => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [unit, setUnit] = useState(existing?.unit ?? "g");
  const [cost, setCost] = useState(
    existing ? String(existing.unit_cost) : ""
  );
  const [supplier, setSupplier] = useState(existing?.supplier ?? "");
  const [estimated, setEstimated] = useState(existing?.is_estimated ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    const cleanName = name.trim();
    const numCost = parseFloat(cost);
    if (!cleanName) {
      setError("Ponle nombre al ingrediente.");
      return;
    }
    if (isNaN(numCost) || numCost < 0) {
      setError("El costo no se ve bien.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const payload = {
        name: cleanName,
        unit,
        unit_cost: numCost,
        supplier: supplier.trim() || null,
        is_estimated: estimated,
      };
      if (existing) {
        const { error: err } = await supabase
          .from("ingredients")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (err) throw err;
        onSaved({ ...existing, ...payload });
      } else {
        const { data, error: err } = await supabase
          .from("ingredients")
          .insert(payload)
          .select("id")
          .single();
        if (err) throw err;
        onSaved({ id: data.id, notes: null, ...payload });
      }
    } catch (e) {
      console.error(e);
      setError("No se pudo guardar. Intenta de nuevo.");
      setBusy(false);
    }
  };

  const borrar = async () => {
    if (!existing || !onDeleted) return;
    if (!confirm(`¿Borrar "${existing.name}"?`)) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from("ingredients")
        .delete()
        .eq("id", existing.id);
      if (err) throw err;
      onDeleted(existing.id);
    } catch (e) {
      console.error(e);
      setError("No se pudo borrar.");
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
      <input
        autoFocus={!existing}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre (ej. Harina de trigo)"
        className="w-full bg-crema-soft rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-antojo/30"
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] text-canela-soft uppercase tracking-wider font-bold">
            Costo $
          </label>
          <input
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            className="w-full bg-crema-soft rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-antojo/30"
          />
        </div>
        <div className="w-28">
          <label className="text-[11px] text-canela-soft uppercase tracking-wider font-bold">
            Por
          </label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full bg-crema-soft rounded-xl px-3 py-2.5 text-sm focus:outline-none"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>
      <input
        value={supplier}
        onChange={(e) => setSupplier(e.target.value)}
        placeholder="Proveedor (opcional)"
        className="w-full bg-crema-soft rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-antojo/30"
      />
      <label className="flex items-center gap-2 text-sm text-canela">
        <input
          type="checkbox"
          checked={estimated}
          onChange={(e) => setEstimated(e.target.checked)}
          className="accent-antojo w-4 h-4"
        />
        Costo estimado (luego lo afino)
      </label>

      {error && <p className="text-rojo text-xs">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={guardar}
          disabled={busy}
          className="flex-1 flex items-center justify-center gap-1.5 bg-verde text-white rounded-xl py-2.5 font-semibold text-sm active:scale-[0.98] transition disabled:opacity-60"
        >
          {busy ? (
            <IconLoader2 size={16} className="animate-spin" />
          ) : (
            <IconCheck size={16} />
          )}
          Guardar
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          className="px-4 rounded-xl text-sm text-canela bg-crema-soft active:scale-[0.98] transition"
        >
          Cancelar
        </button>
        {existing && onDeleted && (
          <button
            onClick={borrar}
            disabled={busy || !canDelete}
            title={
              canDelete ? "Borrar" : "Está en uso en una receta; quítalo de ahí primero."
            }
            className="px-3 rounded-xl text-rojo bg-rojo/10 active:scale-[0.98] transition disabled:opacity-40"
          >
            <IconTrash size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
