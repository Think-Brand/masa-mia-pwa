import KitchenDisplay from "./KitchenDisplay";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const ORDER_FIELDS = `id, folio, status, total, payment_method, contact_person,
       pickup_date, pickup_time, created_at, accepted_at, baking_started_at, ready_at,
       delivered_at, customer_notified_at,
       notes, decline_reason, cancel_reason, cancelled_by,
       is_courtesy, is_birthday_treat, is_welcome_courtesy,
       customer:customers(name, whatsapp)`;

export default async function CocinaPage() {
  const supabase = createClient();

  // Activos: pending → accepted → baking → ready
  const { data: activeData } = await supabase
    .from("orders")
    .select(ORDER_FIELDS)
    .in("status", ["pending", "accepted", "baking", "ready"])
    .order("created_at", { ascending: true });

  // Para el drawer histórico necesitamos:
  // - Entregados HOY
  // - Declinados últimos 30 días
  // - Cancelados últimos 30 días
  // - Histórico últimos 30 días (todos los status finales)
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: deliveredData } = await supabase
    .from("orders")
    .select(ORDER_FIELDS)
    .eq("status", "delivered")
    .gte("delivered_at", startOfDay.toISOString())
    .order("delivered_at", { ascending: false })
    .limit(50);

  const { data: declinedData } = await supabase
    .from("orders")
    .select(ORDER_FIELDS)
    .eq("status", "declined")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: cancelledData } = await supabase
    .from("orders")
    .select(ORDER_FIELDS)
    .eq("status", "cancelled")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: historyData } = await supabase
    .from("orders")
    .select(ORDER_FIELDS)
    .in("status", ["delivered", "declined", "cancelled"])
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(100);

  // Cargar order_items para todos
  const allIds = [
    ...((activeData ?? []).map((o: any) => o.id)),
    ...((deliveredData ?? []).map((o: any) => o.id)),
    ...((declinedData ?? []).map((o: any) => o.id)),
    ...((cancelledData ?? []).map((o: any) => o.id)),
    ...((historyData ?? []).map((o: any) => o.id)),
  ];
  const uniqueIds = Array.from(new Set(allIds));
  const { data: items } =
    uniqueIds.length > 0
      ? await supabase.from("order_items").select("*").in("order_id", uniqueIds)
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
      initialDeclined={withItems(declinedData ?? [])}
      initialCancelled={withItems(cancelledData ?? [])}
      initialHistory={withItems(historyData ?? [])}
    />
  );
}
