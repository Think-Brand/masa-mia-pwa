import Image from "next/image";
import { createClient } from "@/lib/supabase";
import { Product } from "@/lib/types";

export const revalidate = 60;

async function getProducts(): Promise<Product[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_public", true)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching products:", error.message);
    return [];
  }
  return data ?? [];
}

export default async function Home() {
  const products = await getProducts();
  const conectado = products.length > 0;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <Image
        src="/mascota/miga-chef.png"
        alt="Miga, la mascota de Masa Mía"
        width={180}
        height={180}
        priority
      />
      <h1
        className="text-5xl text-cafe leading-none mt-4"
        style={{ fontFamily: "ReginaBlack" }}
      >
        ¿Listos para
        <br />
        el antojo?
      </h1>
      <p className="text-canela text-sm mt-4 max-w-xs leading-relaxed">
        Bienvenido a <b>Masa Mía</b>. La PWA está viva y conectada a la cocina.
      </p>

      <div className="mt-8 bg-white/70 backdrop-blur rounded-2xl p-5 max-w-sm w-full text-left">
        <div className="text-xs font-bold tracking-widest text-canela uppercase mb-3">
          Estado del sistema
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              conectado ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm text-cafe">
            Supabase: {conectado ? "conectado" : "no responde"}
          </span>
        </div>

        <div className="text-xs text-canela mt-3">
          Productos en catálogo:{" "}
          <b className="text-antojo">{products.length}</b>
        </div>

        {conectado && (
          <ul className="text-xs text-canela mt-3 space-y-1 max-h-32 overflow-y-auto">
            {products.slice(0, 8).map((p) => (
              <li key={p.id}>
                · <b>{p.name}</b> — ${p.price}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-caramelo mt-8">
        Fase 0 lista. Siguiente: Fase 1 — catálogo + lead gate.
      </p>
    </main>
  );
}
