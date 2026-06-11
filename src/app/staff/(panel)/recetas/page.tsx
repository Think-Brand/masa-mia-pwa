import { createClient } from "@/lib/supabase-server";
import RecetasManager from "./RecetasManager";

export const dynamic = "force-dynamic";

export default async function RecetasPage() {
  const supabase = createClient();

  const [{ data: ingredients }, { data: products }, { data: recipes }] =
    await Promise.all([
      supabase
        .from("ingredients")
        .select("id, name, unit, unit_cost, supplier, is_estimated, notes")
        .order("name"),
      supabase
        .from("products")
        .select("id, name, emoji, category, price, image_url")
        .eq("is_active", true)
        .order("category")
        .order("sort_order"),
      supabase
        .from("recipes")
        .select(
          "id, product_id, yield_qty, notes, recipe_items(id, ingredient_id, quantity)"
        ),
    ]);

  return (
    <RecetasManager
      initialIngredients={(ingredients ?? []).map((i) => ({
        ...i,
        unit_cost: Number(i.unit_cost),
      }))}
      products={(products ?? []).map((p) => ({
        ...p,
        price: Number(p.price),
      }))}
      initialRecipes={(recipes ?? []).map((r) => ({
        ...r,
        yield_qty: Number(r.yield_qty) || 1,
        recipe_items: (r.recipe_items ?? []).map((it) => ({
          ...it,
          quantity: Number(it.quantity),
        })),
      }))}
    />
  );
}
