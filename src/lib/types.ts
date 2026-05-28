// Tipos para tablas de Supabase — Masa Mía

export type Category = "rol" | "berlinesa" | "rollinbox" | "luvinbox";

export type Product = {
  id: string;
  category: Category;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  emoji: string | null;
  is_public: boolean;
  is_active: boolean;
  is_limited?: boolean;
  is_new?: boolean;
  price_is_starting?: boolean;
  allergens?: string[] | null;
  prep_days?: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type BoxComponent = {
  id: string;
  box_product_id: string;
  name: string;
  description: string | null;
  quantity: number;
  category_filter: string | null;
  is_required: boolean;
  is_active: boolean;
  allow_repeat: boolean;
  show_options: boolean;
  sort_order: number;
};

export type ComponentOption = {
  id: string;
  component_id: string;
  name: string;
  is_available: boolean;
  price_modifier: number;
  sort_order: number;
};

export type Customer = {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  notes: string | null;
  total_orders: number;
  total_spent: number;
  first_order_at: string | null;
  last_order_at: string | null;
  created_at: string;
};

export type OrderStatus =
  | "pending"
  | "accepted"
  | "baking"
  | "delivered"
  | "declined"
  | "cancelled";

export type Order = {
  id: string;
  folio: string;
  customer_id: string | null;
  status: OrderStatus;
  total: number;
  payment_method: "efectivo" | "transferencia" | "cortesia" | null;
  source: "pwa" | "whatsapp" | "instagram" | "recomendacion";
  delivery_date: string | null;
  delivery_time: string | null;
  pickup_date: string | null;
  contact_person: "alex" | "fabiola" | null;
  notes: string | null;
  decline_reason: string | null;
  decline_message: string | null;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  delivered_at: string | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
};
