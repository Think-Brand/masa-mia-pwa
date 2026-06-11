/** Tipos compartidos de la sección Recetas (staff). */

export type Ingredient = {
  id: string;
  name: string;
  unit: string;
  unit_cost: number;
  supplier: string | null;
  is_estimated: boolean | null;
  notes: string | null;
};

export type RecipeItem = {
  id: string;
  ingredient_id: string | null;
  quantity: number;
};

export type Recipe = {
  id: string;
  product_id: string | null;
  yield_qty: number;
  notes: string | null;
  recipe_items: RecipeItem[];
};

export type ProductLite = {
  id: string;
  name: string;
  emoji: string | null;
  category: string;
  price: number;
  image_url: string | null;
};

export const UNITS = ["g", "kg", "ml", "l", "pza", "paquete"] as const;

export function fmtMoney(n: number): string {
  return `$${n.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Costo total de una receta (Σ cantidad × costo unitario del ingrediente). */
export function recipeCost(
  recipe: Recipe | undefined,
  ingredients: Ingredient[]
): number | null {
  if (!recipe || recipe.recipe_items.length === 0) return null;
  const map = new Map(ingredients.map((i) => [i.id, i]));
  let total = 0;
  for (const it of recipe.recipe_items) {
    const ing = it.ingredient_id ? map.get(it.ingredient_id) : null;
    if (!ing) continue;
    total += Number(it.quantity) * Number(ing.unit_cost);
  }
  return total;
}
