import KitchenDisplay from "./KitchenDisplay";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function CocinaPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      `id, folio, status, total, payment_method, contact_person,
       pickup_date, created_at, notes,
       customer:customers(name, whatsapp)`
    )
    .in("status", ["pending", "accepted", "baking"])
    .order("created_at", { ascending: true });

  // Cargar order_items asociados
  const orderIds = (data ?? []).map((o: any) => o.id);
  const { data: items } =
    orderIds.length > 0
      ? await supabase
          .from("order_items")
          .select("*")
          .in("order_id", orderIds)
      : { data: [] as any };

  const ordersWithItems = (data ?? []).map((o: any) => ({
    ...o,
    items: (items ?? []).filter((i: any) => i.order_id === o.id),
  }));

  return <KitchenDisplay initialOrders={ordersWithItems} />;
}
