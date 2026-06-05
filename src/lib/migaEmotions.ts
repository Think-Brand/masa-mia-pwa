/**
 * Mapa de emociones → imágenes de Miga.
 *
 * Regla de oro: la cara de Miga SIEMPRE debe matchear el tono del mensaje.
 * Es raro decir "lo siento" y mostrar a Miga riéndose.
 *
 * Cada emoción tiene 1 o más variantes. `pickMiga(emocion)` devuelve una al
 * azar para darle dinamismo a la app sin repetirse.
 */

export type MigaEmocion =
  | "feliz"          // saludos, bienvenida, alegría general
  | "antojada"       // foodie, mostrando algo rico
  | "orgullosa"      // master chef, marca, presentación
  | "agradecida"     // gracias, compra confirmada
  | "celebrando"     // cumple, hitos, sorpresa positiva
  | "ocupada"        // horneando, trabajando, "en proceso"
  | "tranquila"      // relajado, esperando, callado
  | "dormida"        // fuera de horario, vacaciones, "sin pedidos"
  | "sorprendida"    // wow, descuento aplicado, "no esperabas esto"
  | "idea"           // sugerencia, antojame, recomendación
  | "confundida"     // error suave, "no encontré tu pedido"
  | "apenada"        // perdón formal, "lo sentimos no se pudo"
  | "culpable"       // perdón con chiste, "me comí el último"
  | "dramatica"      // cuando algo NO se pudo y queremos darle gracia
  | "vacaciones"     // modo vacaciones, postal
  | "saluda";        // "hola de nuevo", check-in

const MAPA: Record<MigaEmocion, string[]> = {
  feliz: ["/mascota/miga-adorable.png", "/mascota/miga-tierna.png"],
  antojada: ["/mascota/miga-algo-entre-manos.png", "/mascota/miga-lista.png"],
  orgullosa: ["/mascota/master chef.png", "/mascota/miga-chef.png"],
  agradecida: ["/mascota/agradecida.png"],
  celebrando: ["/mascota/miga-malabares.png", "/mascota/sorprendida.png"],
  ocupada: ["/mascota/atareada.png", "/mascota/miga-chef.png"],
  tranquila: ["/mascota/chill.png", "/mascota/sentada.png", "/mascota/miga-sentada.png"],
  dormida: ["/mascota/dormida.png"],
  sorprendida: ["/mascota/sorprendida.png"],
  idea: ["/mascota/una-idea.png", "/mascota/recomendando.png"],
  confundida: ["/mascota/condundida.png"],
  apenada: ["/mascota/lo-siento.png"],
  culpable: ["/mascota/culpable.png"],
  dramatica: ["/mascota/drama.png", "/mascota/lo-siento.png"],
  vacaciones: ["/mascota/vacaciones-1.png", "/mascota/vacaciones-2.png"],
  saluda: ["/mascota/miga-senalar.png", "/mascota/miga-cintura.png"],
};

/**
 * Devuelve UNA imagen de Miga para la emoción dada.
 *
 * @param emocion qué siente Miga
 * @param seed   opcional — si pasas el mismo seed siempre te toca la misma
 *               variante (sirve para "MM-027 → Miga X" consistente entre
 *               renders del mismo pedido).
 */
export function pickMiga(emocion: MigaEmocion, seed?: string | number): string {
  const opciones = MAPA[emocion] ?? MAPA.feliz;
  if (opciones.length === 1) return opciones[0];
  if (seed != null) {
    const s = typeof seed === "number" ? seed : hashString(seed);
    return opciones[s % opciones.length];
  }
  return opciones[Math.floor(Math.random() * opciones.length)];
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Sinónimo legible para el mensaje "culpable" cuando se acabó un sabor. */
export const MENSAJE_CULPABLE_FALTANTE =
  "Me comí el último 🥲 pero prometo hacer más muy pronto.";
