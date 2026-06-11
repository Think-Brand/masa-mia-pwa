"use client";

import { useMemo, useRef, useState } from "react";
import {
  IconChefHat,
  IconLoader2,
  IconShoppingBag,
} from "@tabler/icons-react";
import type { Icon as TablerIcon } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase";
import IngredientesTab from "./IngredientesTab";
import RecetaEditor from "./RecetaEditor";
import {
  Ingredient,
  ProductLite,
  Recipe,
  fmtMoney,
  recipeCost,
} from "./types";

type Tab = "recetas" | "ingredientes";

export default function RecetasManager({
  initialIngredients,
  products,
  initialRecipes,
}: {
  initialIngredients: Ingredient[];
  products: ProductLite[];
  initialRecipes: Recipe[];
}) {
  const [tab, setTab] = useState<Tab>("recetas");
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initialIngredients
  );
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [prods, setProds] = useState<ProductLite[]>(products);
  const [editing, setEditing] = useState<ProductLite | null>(null);

  // Cambio de foto del producto desde la lista
  const fileRef = useRef<HTMLInputElement | null>(null);
  const photoTarget = useRef<ProductLite | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const pickPhoto = (p: ProductLite) => {
    photoTarget.current = p;
    fileRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const product = photoTarget.current;
    if (!file || !product) return;
    if (file.size > 4 * 1024 * 1024) {
      alert("La foto debe pesar menos de 4 MB.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setUploadingId(product.id);
    try {
      const supabase = createClient();
      const slug = product.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `productos/${slug}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("productos")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage
        .from("productos")
        .getPublicUrl(path);
      const { error: dbErr } = await supabase
        .from("products")
        .update({
          image_url: urlData.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product.id);
      if (dbErr) throw dbErr;
      setProds((curr) =>
        curr.map((x) =>
          x.id === product.id ? { ...x, image_url: urlData.publicUrl } : x
        )
      );
    } catch (err) {
      console.error(err);
      alert("No se pudo subir la foto. Intenta de nuevo.");
    } finally {
      setUploadingId(null);
      photoTarget.current = null;
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Una receta por producto (la primera si hubiera varias)
  const recipeByProduct = useMemo(() => {
    const m = new Map<string, Recipe>();
    for (const r of recipes) {
      if (r.product_id && !m.has(r.product_id)) m.set(r.product_id, r);
    }
    return m;
  }, [recipes]);

  // Ingredientes usados en alguna receta (para bloquear borrado)
  const usedIngredientIds = useMemo(() => {
    const s = new Set<string>();
    for (const r of recipes) {
      for (const it of r.recipe_items) {
        if (it.ingredient_id) s.add(it.ingredient_id);
      }
    }
    return s;
  }, [recipes]);

  const onRecipeSaved = (saved: Recipe) => {
    setRecipes((curr) => {
      const idx = curr.findIndex((r) => r.id === saved.id);
      if (idx >= 0) {
        const copy = [...curr];
        copy[idx] = saved;
        return copy;
      }
      return [...curr, saved];
    });
    setEditing(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4">
      <h1
        className="text-3xl text-cafe mb-1"
        style={{ fontFamily: "ReginaBlack" }}
      >
        Recetas
      </h1>
      <p className="text-canela text-sm mb-4">
        Captura ingredientes y recetas para saber cuánto cuesta cada pieza.
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <TabButton
          active={tab === "recetas"}
          onClick={() => setTab("recetas")}
          label="Recetas"
          Icon={IconChefHat}
        />
        <TabButton
          active={tab === "ingredientes"}
          onClick={() => setTab("ingredientes")}
          label={`Ingredientes (${ingredients.length})`}
          Icon={IconShoppingBag}
        />
      </div>

      {tab === "ingredientes" ? (
        <IngredientesTab
          ingredients={ingredients}
          setIngredients={setIngredients}
          usedIngredientIds={usedIngredientIds}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {ingredients.length === 0 && (
            <div className="bg-avellana-soft rounded-2xl p-4 text-sm text-canela">
              Empieza en la pestaña <b>Ingredientes</b>: agrega harina,
              mantequilla, azúcar… con su costo. Después arma aquí la receta
              de cada producto.
            </div>
          )}
          {prods.map((p) => {
            const recipe = recipeByProduct.get(p.id);
            const cost = recipeCost(recipe, ingredients);
            const perPiece =
              cost !== null && recipe ? cost / (recipe.yield_qty || 1) : null;
            const foodCost =
              perPiece !== null && p.price > 0
                ? (perPiece / p.price) * 100
                : null;
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3"
              >
                {/* Foto del producto: tap para cambiarla */}
                <button
                  onClick={() => pickPhoto(p)}
                  disabled={uploadingId === p.id}
                  aria-label={`Cambiar foto de ${p.name}`}
                  className="relative w-11 h-11 rounded-full bg-crema-soft flex-shrink-0 flex items-center justify-center text-xl overflow-hidden active:scale-90 transition"
                >
                  {uploadingId === p.id ? (
                    <IconLoader2
                      size={16}
                      className="animate-spin text-canela"
                    />
                  ) : p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    p.emoji || "🥐"
                  )}
                </button>
                <button
                  onClick={() => setEditing(p)}
                  className="flex-1 min-w-0 flex items-center gap-3 text-left active:scale-[0.99] transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-cafe truncate">
                      {p.name}
                    </p>
                    {recipe && perPiece !== null ? (
                      <p className="text-xs text-canela">
                        Cuesta {fmtMoney(perPiece)} / pza · vende{" "}
                        {fmtMoney(p.price)}
                      </p>
                    ) : (
                      <p className="text-xs text-canela-soft italic">
                        Sin receta todavía
                      </p>
                    )}
                  </div>
                  {foodCost !== null && (
                    <span
                      className={`text-[11px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                        foodCost <= 35
                          ? "bg-verde/15 text-verde"
                          : foodCost <= 50
                            ? "bg-antojo/15 text-antojo"
                            : "bg-rojo/15 text-rojo"
                      }`}
                    >
                      {Math.round(foodCost)}% costo
                    </span>
                  )}
                </button>
              </div>
            );
          })}

          {/* Input compartido para subir/tomar foto (sin capture: iOS
              ofrece Fototeca / Tomar foto / Elegir archivo) */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onFile}
            className="hidden"
          />
        </div>
      )}

      {editing && (
        <RecetaEditor
          product={editing}
          recipe={recipeByProduct.get(editing.id) ?? null}
          ingredients={ingredients}
          onClose={() => setEditing(null)}
          onSaved={onRecipeSaved}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  Icon: TablerIcon;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition ${
        active ? "bg-cafe text-crema" : "bg-white text-canela shadow-sm"
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}
