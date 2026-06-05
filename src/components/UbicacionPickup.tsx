"use client";

import { IconMapPin, IconExternalLink } from "@tabler/icons-react";
import { Settings } from "@/lib/settings";

/**
 * Ubicación de recolección — bloque FIJO (siempre visible) en el carrito,
 * justo bajo las Notas. Antes de pagar, el comensal ve dónde recoge y que
 * por ahora no hacemos envíos a domicilio. Datos reales desde Ajustes.
 *
 * El mapa es un embed de Google Maps (sin API key) usando la dirección.
 */
export default function UbicacionPickup({
  settings,
}: {
  settings: Settings | null;
}) {
  // Mientras cargan settings, un placeholder discreto (evita saltos de layout).
  if (!settings) {
    return (
      <div className="bg-white rounded-xl border border-caramelo/30 h-40 animate-pulse" />
    );
  }

  const direccion =
    settings.pickup_address_full ||
    [
      settings.pickup_address_line1,
      settings.pickup_address_line2,
      settings.pickup_address_city,
    ]
      .filter(Boolean)
      .join(", ") ||
    "Cdad. Gral. Escobedo, N.L.";

  const ciudad = settings.pickup_address_city || "Escobedo, N.L.";
  const mapsUrl =
    settings.pickup_maps_url ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
  const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(direccion)}&output=embed`;

  return (
    <div className="bg-white rounded-xl border border-caramelo/30 overflow-hidden">
      {/* Encabezado */}
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-2">
        <span className="text-cafe flex-shrink-0">
          <IconMapPin size={18} />
        </span>
        <div className="min-w-0">
          <div
            className="text-[11px] font-bold text-canela uppercase tracking-wider leading-none"
            style={{ fontFamily: "Termina" }}
          >
            Aquí nos ubicamos
          </div>
          <div className="text-sm text-cafe font-bold mt-0.5 leading-tight">
            Recoges en {ciudad}
          </div>
        </div>
      </div>

      {/* Mapa */}
      <div className="relative w-full h-40 bg-crema-soft">
        <iframe
          title="Mapa de Masa Mía"
          src={embedUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-full border-0"
          style={{ filter: "saturate(1.05)" }}
        />
      </div>

      {/* Dirección + aviso honesto de no-envío + abrir en Maps */}
      <div className="px-3 py-2.5">
        <p className="text-sm text-cafe leading-snug">{direccion}</p>
        <p className="text-[11px] text-canela italic mt-1 leading-snug">
          Horneamos aquí y aquí recoges tu antojo 🤎 Por ahora no manejamos
          envíos a domicilio.
        </p>
        {settings.pickup_hours_note && (
          <p className="text-[11px] text-canela-soft mt-1 leading-snug">
            {settings.pickup_hours_note}
          </p>
        )}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-antojo active:scale-95 transition"
        >
          <IconExternalLink size={14} stroke={2.4} />
          Abrir en Google Maps
        </a>
      </div>
    </div>
  );
}
