import KitchenDisplay from "./KitchenDisplay";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function CocinaPage() {
  const supabase = createClient();

  // Activos: pending → accepted → baking → ready
  const { data: activeData } = await supabase
    .from("orders")
    .select(
      `id, folio, status, total, payment_method, contact_person,
       pickup_date, created_at, accepted_at, baking_started_at, ready_at,
       notes, is_courtesy, is_birthday_treat, is_welcome_courtesy,
       customer:customers(name, whatsapp)`
    )
    .in("status", ["pending", "accepted", "baking", "ready"])
    .order("created_at", { ascending: true });

  // Entregados del día (para drawer discreto)
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data: deliveredData } = await supabase
    .from("orders")
    .select(
      `id, folio, status, total, payment_method, contact_person,
       pickup_date, created_at, accepted_at, baking_started_at, ready_at,
       delivered_at, notes, is_courtesy, is_birthday_treat, is_welcome_courtesy,
       customer:customers(name, whatsapp)`
    )
    .eq("status", "delivered")
    .gte("delivered_at", startOfDay.toISOString())
    .order("delivered_at", { ascending: false })
    .limit(50);

  // Cargar order_items asociados a ambos sets
  const allIds = [
    ...((activeData ?? []).map((o: any) => o.id)),
    ...((deliveredData ?? []).map((o: any) => o.id)),
  ];
  const { data: items } =
    allIds.length > 0
      ? await supabase.from("order_items").select("*").in("order_id", allIds)
      : { data: [] as any };

  const withItems = (rows: any[]) =>
    rows.map((o: any) => ({
      ...o,
      items: (items ?? []).filter((i: any) => i.order_id === o.id),
    }));

  return (
    <KitchenDisplay
      initialOrders={withItems(activeData ?? [])}
      initialDelivered={withItems(deliveredData ?? [])}
    />
  );
}
