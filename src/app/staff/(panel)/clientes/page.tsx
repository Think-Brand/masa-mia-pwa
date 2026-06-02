import { createClient } from "@/lib/supabase-server";
import ClientesList from "./ClientesList";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const supabase = createClient();

  const { data: customers } = await supabase
    .from("customers")
    .select(
      `id, name, whatsapp, email, notes, total_orders, total_spent,
       first_order_at, last_order_at, created_at, avatar_pose, birthday,
       received_welcome_courtesy`
    )
    .order("last_order_at", { ascending: false, nullsFirst: false });

  return <ClientesList initialCustomers={customers ?? []} />;
}
