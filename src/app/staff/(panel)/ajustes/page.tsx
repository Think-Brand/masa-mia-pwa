import { IconSettings } from "@tabler/icons-react";

export const dynamic = "force-dynamic";

export default function AjustesPage() {
  return (
    <main className="px-4 pt-4">
      <h1
        className="text-3xl text-cafe leading-none"
        style={{ fontFamily: "ReginaBlack" }}
      >
        Ajustes
      </h1>
      <p className="text-xs text-canela mt-1">
        Aquí podrás editar dirección, contactos, productos, opciones de boxes.
      </p>

      <div className="mt-10 bg-white rounded-2xl p-6 text-center text-canela">
        <IconSettings size={48} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm">
          Esta pantalla está en construcción 🔨
        </p>
        <p className="text-xs italic mt-1">
          (Capítulo 4 de Fase 2: lo vamos a armar muy pronto.)
        </p>
      </div>
    </main>
  );
}
