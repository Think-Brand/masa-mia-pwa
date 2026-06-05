/**
 * Parser y agregador de pedidos para la lista de producción.
 *
 * El campo `product_name` en order_items viene serializado con la composición
 * dentro de [corchetes]. Ejemplos:
 *
 *   "Lotusho"                                  (rol individual)
 *   "Nutella"                                  (berlinesa individual)
 *   "RollinBox [4 roles a tu elección: 1× Lotusho, 1× Mil Besos, ...]"
 *   "LuvinBox [4 roles: ... | 4 berlinesas: 2× Nutella, 2× Original]"
 *
 * IMPORTANTE: los sabores de berlinesa (Nutella, Original) NO empiezan con
 * "berlinesa". Por eso necesitamos un mapa nombre→categoría obtenido de la
 * tabla products para clasificar correctamente.
 */

export type ProductionTally = {
  /** Sabores de rol → cantidad de piezas */
  rolesPorSabor: Map<string, number>;
  /** Sabores de berlinesa → cantidad de piezas */
  berlinesasPorSabor: Map<string, number>;
  /** Total de RollinBox a armar */
  rollinBoxCount: number;
  /** Total de LuvinBox a armar */
  luvinBoxCount: number;
  /** Total de piezas de rol (sumando standalone + dentro de boxes) */
  totalRoles: number;
  /** Total de piezas de berlinesa */
  totalBerlinesas: number;
};

export type ItemLite = {
  product_name: string;
  quantity: number;
};

/** Mapa de nombre de producto (minúsculas) → categoría. */
export type CategoryByName = Map<string, string>;

function parseItem(productName: string): {
  baseName: string;
  rolesInside: { sabor: string; qty: number }[];
  berlinesasInside: { sabor: string; qty: number }[];
} {
  const bracketStart = productName.indexOf(" [");
  if (bracketStart === -1) {
    return { baseName: productName.trim(), rolesInside: [], berlinesasInside: [] };
  }
  const baseName = productName.slice(0, bracketStart).trim();
  const inside = productName
    .slice(bracketStart + 2, productName.lastIndexOf("]"))
    .trim();

  const componentes = inside.split(" | ");
  const rolesInside: { sabor: string; qty: number }[] = [];
  const berlinesasInside: { sabor: string; qty: number }[] = [];

  for (const comp of componentes) {
    const colonIdx = comp.indexOf(":");
    if (colonIdx === -1) continue;
    const header = comp.slice(0, colonIdx).toLowerCase();
    const list = comp.slice(colonIdx + 1).trim();

    const esRoles = header.includes("rol");
    const esBerlinesas = header.includes("berlinesa");

    const selections = list.split(",").map((s) => s.trim()).filter(Boolean);
    for (const sel of selections) {
      const match = sel.match(/^(\d+)\s*[×x]\s*(.+)$/);
      if (!match) continue;
      const qty = parseInt(match[1], 10);
      const sabor = match[2].trim();
      if (esRoles) rolesInside.push({ sabor, qty });
      else if (esBerlinesas) berlinesasInside.push({ sabor, qty });
    }
  }

  return { baseName, rolesInside, berlinesasInside };
}

/**
 * Recorre todos los items de los pedidos y construye el plan de producción.
 * `categoryByName` es opcional pero ALTAMENTE recomendado — sin ese mapa el
 * parser no puede distinguir berlinesas (Nutella, Original) de roles cuando
 * vienen como items individuales sin prefijo.
 */
export function buildProductionTally(
  items: ItemLite[],
  categoryByName?: CategoryByName
): ProductionTally {
  const rolesPorSabor = new Map<string, number>();
  const berlinesasPorSabor = new Map<string, number>();
  let rollinBoxCount = 0;
  let luvinBoxCount = 0;

  const addRol = (sabor: string, qty: number) => {
    rolesPorSabor.set(sabor, (rolesPorSabor.get(sabor) ?? 0) + qty);
  };
  const addBerlinesa = (sabor: string, qty: number) => {
    berlinesasPorSabor.set(sabor, (berlinesasPorSabor.get(sabor) ?? 0) + qty);
  };

  // Helper: clasifica un nombre de producto en una categoría usando el mapa
  // de la BD, con fallback a heurística por prefijo si el mapa no está.
  const classify = (name: string): string => {
    const lower = name.toLowerCase().trim();
    if (categoryByName?.has(lower)) return categoryByName.get(lower)!;
    if (lower === "rollinbox" || lower.startsWith("rollinbox"))
      return "rollinbox";
    if (lower === "luvinbox" || lower.startsWith("luvinbox")) return "luvinbox";
    if (lower.startsWith("berlinesa")) return "berlinesa";
    return "rol"; // default: si no sabemos, asume rol
  };

  for (const item of items) {
    const { baseName, rolesInside, berlinesasInside } = parseItem(
      item.product_name
    );
    const qtyOuter = item.quantity;
    const category = classify(baseName);

    if (category === "rollinbox") {
      rollinBoxCount += qtyOuter;
      for (const r of rolesInside) addRol(r.sabor, r.qty * qtyOuter);
      for (const b of berlinesasInside) addBerlinesa(b.sabor, b.qty * qtyOuter);
    } else if (category === "luvinbox") {
      luvinBoxCount += qtyOuter;
      for (const r of rolesInside) addRol(r.sabor, r.qty * qtyOuter);
      for (const b of berlinesasInside) addBerlinesa(b.sabor, b.qty * qtyOuter);
    } else if (category === "berlinesa") {
      // Limpia prefijo "Berlinesa " si está, si no usa el nombre tal cual.
      const sabor =
        baseName.replace(/^berlinesa\s+/i, "").trim() || baseName;
      addBerlinesa(sabor, qtyOuter);
    } else {
      // Rol: el nombre ES el sabor
      addRol(baseName, qtyOuter);
    }
  }

  let totalRoles = 0;
  for (const v of rolesPorSabor.values()) totalRoles += v;
  let totalBerlinesas = 0;
  for (const v of berlinesasPorSabor.values()) totalBerlinesas += v;

  return {
    rolesPorSabor,
    berlinesasPorSabor,
    rollinBoxCount,
    luvinBoxCount,
    totalRoles,
    totalBerlinesas,
  };
}
