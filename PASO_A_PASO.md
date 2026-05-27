# PASO A PASO — Subir Masa Mía a GitHub y dejarla viva

Hola Mario. Estos son los **4 pasos** para que la PWA salga al aire. Te toma ~10 minutos. Si te trabas en algún punto, me avisas en el chat y lo destrabamos.

## 1. Descomprime el zip

Hago doble clic a `masa-mia-pwa.zip` y queda una carpeta `PWA/` lista.

## 2. Crea el repo en GitHub

Si no tienes cuenta de GitHub: [github.com/signup](https://github.com/signup) (gratis, 1 minuto).

Luego ve a [github.com/new](https://github.com/new) y crea un repo así:

- **Repository name:** `masa-mia-pwa`
- **Description:** "PWA de Masa Mía — catálogo y pedidos"
- **Privacidad:** Private (recomendado)
- **NO** marques "Add a README" / "Add .gitignore" / "Add license" — ya están en el zip
- Clic en **Create repository**

GitHub te va a mostrar una pantalla con instrucciones. **Guárdala abierta**, en el siguiente paso usamos los comandos que aparecen ahí.

## 3. Sube el código (4 comandos en la Terminal)

Abre la app **Terminal** (Cmd + Espacio → "Terminal"). Pega estos comandos uno por uno:

```bash
cd "/Users/thinkbrand/Documents/Claude/Projects/Masa Mía/PWA"
git init
git add .
git commit -m "Inicio: setup PWA Masa Mía"
git branch -M main
```

Después, copia la línea que GitHub te mostró que empieza con `git remote add origin ...` y pégala (se ve así):

```bash
git remote add origin https://github.com/TU-USUARIO/masa-mia-pwa.git
git push -u origin main
```

Si te pide usuario/contraseña: usa tu usuario de GitHub y un **Personal Access Token** (no la contraseña real). GitHub te explica cómo hacerlo si te pregunta.

## 4. Avísame "ya está en GitHub"

En cuanto el push termine, escríbeme:

> ya está en GitHub: github.com/MARIO/masa-mia-pwa

**Yo me encargo del resto desde aquí:**
- Conectar el repo a Netlify (que ya está creado en `masa-mia.netlify.app`)
- Disparar el primer build
- Verificar que cargue conectado a Supabase
- Mandarte la URL viva

---

## Lo que ya está hecho (no tienes que tocar)

- ✅ **Supabase** — proyecto `masa-mia` creado, 8 tablas con Row Level Security, 12 productos cargados
- ✅ **Netlify** — sitio `masa-mia` creado, variables de entorno configuradas
- ✅ **Código Next.js 14** — paleta, tipografías, mascota Miga, cliente Supabase, manifest PWA
- ✅ **Assets optimizados** — fotos de productos y mascota (de 65MB a 20MB)

## Lo que sigue después del deploy (Fase 1)

Una vez confirmada la URL viva, arrancamos las pantallas reales del wireframe v6:

1. Lead gate (¿Listos para el antojo?)
2. Catálogo público con tabs por categoría
3. Detalle de producto con sugerencias
4. Carrito + pago con copia de cuenta BBVA
5. Confirmar pedido por WhatsApp
