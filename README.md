# Masa Mía — PWA

Aplicación web progresiva para Masa Mía. Catálogo público con captura de lead, panel de staff para pedidos y administración de productos.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** con paleta oficial
- **Supabase** (Postgres + Auth + Storage + Realtime)
- **Netlify** para hosting

## Cómo levantar el proyecto en local

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
cp .env.local.example .env.local

# 3. Correr en modo desarrollo
npm run dev
```

Abre <http://localhost:3000>.

## Estructura

```
src/
├── app/
│   ├── layout.tsx       # Root layout con metadata PWA
│   ├── page.tsx         # Lead gate (Pantalla 1)
│   ├── catalogo/        # Catálogo público (Pantalla 2)
│   ├── producto/[slug]/ # Detalle de producto (Pantalla 3-4)
│   ├── carrito/         # Carrito + pago (Pantalla 5)
│   └── staff/
│       ├── login/       # Login staff (Pantalla 6)
│       └── pedidos/     # Kanban de pedidos (Pantalla 7-8)
├── components/          # Botones, inputs, cards reutilizables
└── lib/
    ├── supabase.ts      # Cliente Supabase
    └── types.ts         # Tipos de las 8 tablas
```

## Fases

- **Fase 0** ✅ Setup, deploy, conexión a Supabase
- **Fase 1** Catálogo público + lead gate + pedido por WhatsApp
- **Fase 2** Staff login + kanban de pedidos
- **Fase 3** CRUD productos con foto + recetas con costeo
- **Fase 4** CRM clientes + reportes
- **Fase 5** Push notifications + offline + pulido

## Despliegue

Cada push a `main` despliega automáticamente en Netlify.
