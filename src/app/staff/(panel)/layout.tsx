import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import StaffHeader from "@/components/StaffHeader";
import StaffOnboarding from "@/components/StaffOnboarding";

export const dynamic = "force-dynamic";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/staff/login");
  }

  // Si el usuario aún tiene must_change_password, forzar cambio
  const mustChange = user.user_metadata?.must_change_password === true;
  if (mustChange) {
    redirect("/staff/cambiar-password");
  }

  const name = (user.user_metadata?.name as string) || "Cocinera";

  return (
    <div className="min-h-screen bg-crema-soft">
      <StaffHeader userName={name} />
      {/*
        Sin max-width aquí: cada página decide su propio ancho.
        Cocina usa todo el viewport (kanban full responsive).
        Pedidos/Dashboard/Ajustes/Detalle aplican su propio max-w-2xl.
      */}
      <div className="pb-8">{children}</div>
      {/* Tour de Miga al primer login (solo si pilot_mode = on) */}
      <StaffOnboarding />
    </div>
  );
}
