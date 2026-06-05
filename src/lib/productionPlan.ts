/**
 * Parser y agregador de pedidos para la lista de producción.
 *
 * El campo `product_name` en order_items viene serializado con la composición
 * dentro de [corchetes]. Ejemplos:
 *
 *   "Lotusho"
 *   "Mil Besos"
 *   "Berlinesa fresa"
 *   "RollinBox [4 roles a tu elección: 1× Lotusho, 1× Mil Besos, 1× Frutella, 1× Mangoco]"
 *   "LuvinBox [4 roles: 1× Lotusho, 1× Mil Besos, 1× Mangoco, 1× Frutella | 4 berlinesas: 2× fresa, 2× chocolate]"
 *
 * Este módulo desempaca cada item y suma cuántas piezas hay que hornear de
 * cada sabor (rol y berlinesa) y cuántos boxes hay que armar.
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

/**
 * Parsea un product_name y devuelve los sabores que contiene.
 * Si no tiene composición [corchetes], devuelve el nombre como sabor único.
 */
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

  // Múltiples componentes separados por " | " (LuvinBox tiene 2: roles + berlinesas)
  const componentes = inside.split(" | ");
  const rolesInside: { sabor: string; qty: number }[] = [];
  const berlinesasInside: { sabor: string; qty: number }[] = [];

  for (const comp of componentes) {
    // comp tiene forma "4 roles a tu elección: 1× Lotusho, 1× Mil Besos"
    const colonIdx = comp.indexOf(":");
    if (colonIdx === -1) continue;
    const header = comp.slice(0, colonIdx).toLowerCase();
    const list = comp.slice(colonIdx + 1).trim();

    // Detectar si el componente es de roles o berlinesas por palabra clave.
    const esRoles = header.includes("rol");
    const esBerlinesas = header.includes("berlinesa");

    const selections = list.split(",").map((s) => s.trim()).filter(Boolean);
    for (const sel of selections) {
      // "1× Lotusho" → qty=1, sabor="Lotusho"
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
 */
export function buildProductionTally(items: ItemLite[]): ProductionTally {
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

  for (const item of items) {
    const { baseName, rolesInside, berlinesasInside } = parseItem(
      item.product_name
    );
    const qtyOuter = item.quantity;
    const baseLower = baseName.toLowerCase();

    if (baseLower === "rollinbox" || baseLower.startsWith("rollinbox")) {
      rollinBoxCount += qtyOuter;
      for (const r of rolesInside) addRol(r.sabor, r.qty * qtyOuter);
      for (const b of berlinesasInside) addBerlinesa(b.sabor, b.qty * qtyOuter);
    } else if (baseLower === "luvinbox" || baseLower.startsWith("luvinbox")) {
      luvinBoxCount += qtyOuter;
      for (const r of rolesInside) addRol(r.sabor, r.qty * qtyOuter);
      for (const b of berlinesasInside) addBerlinesa(b.sabor, b.qty * qtyOuter);
    } else if (baseLower.startsWith("berlinesa")) {
      // "Berlinesa fresa" → sabor "fresa"
      const sabor = baseName.replace(/^berlinesa\s+/i, "").trim() || baseName;
      addBerlinesa(sabor, qtyOuter);
    } else {
      // Rol individual: el nombre ES el sabor
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
