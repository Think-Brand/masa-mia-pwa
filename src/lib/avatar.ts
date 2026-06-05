/**
 * Resuelve el avatar del cliente desde el campo `avatar_pose`.
 *
 * Formatos soportados:
 *  - "avatar-N"     (N = 1..N de /public/avatares/avatar-N.png) — formato nuevo
 *  - "data:..."     (foto custom del cliente)                   — formato nuevo
 *  - "adorable"|"chef"|"lista"|... (pose de Miga legacy)        — clientes viejos
 *  - null/undefined → fallback avatar-1
 *
 * IMPORTANTE: este helper es la fuente de verdad. Antes había 2 implementaciones
 * paralelas (cliente y staff) y el staff usaba el mapa de POSES con el campo
 * "avatar-1", por lo que SIEMPRE caía al default → todos los cumpleaños se
 * veían iguales.
 */

const MIGA_POSES_LEGACY: Record<string, string> = {
  adorable: "/mascota/miga-adorable.png",
  tierna: "/mascota/miga-tierna.png",
  lista: "/mascota/miga-lista.png",
  senalar: "/mascota/miga-senalar.png",
  chef: "/mascota/miga-chef.png",
  sentada: "/mascota/miga-sentada.png",
  cintura: "/mascota/miga-cintura.png",
  espalda: "/mascota/miga-espalda.png",
  malabares: "/mascota/miga-malabares.png",
  algo_entre_manos: "/mascota/miga-algo-entre-manos.png",
};

export const TOTAL_AVATAR_OPTIONS = 13;
export const AVATAR_IDS = Array.from(
  { length: TOTAL_AVATAR_OPTIONS },
  (_, i) => `avatar-${i + 1}`
);

export function getAvatarSrc(pose: string | null | undefined): string {
  if (!pose) return "/avatares/avatar-1.png";
  // Foto custom del cliente (subida)
  if (pose.startsWith("data:")) return pose;
  // Avatar nuevo
  if (pose.startsWith("avatar-")) return `/avatares/${pose}.png`;
  // Pose Miga legacy
  const legacy = MIGA_POSES_LEGACY[pose.toLowerCase()];
  if (legacy) return legacy;
  // Default
  return "/avatares/avatar-1.png";
}
