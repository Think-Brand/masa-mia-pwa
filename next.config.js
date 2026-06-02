/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Sin optimización por Vercel — las imágenes locales ya están comprimidas,
    // y las de Supabase Storage también. Esto evita consumir el límite mensual
    // de 1,000 image optimizations del plan Hobby.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  // Headers de seguridad (defense in depth).
  // CSP queda pendiente — requiere whitelist cuidadosa de Supabase, fonts y
  // assets dinámicos. Se atacará en una vuelta dedicada.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Fuerza HTTPS para futuras visitas durante 2 años, incluye subdominios.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Prohíbe que el sitio se cargue en un iframe (anti-clickjacking).
          { key: 'X-Frame-Options', value: 'DENY' },
          // Bloquea sniffing de tipo MIME.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // No filtra el path completo al navegar a sitios externos.
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Cámara solo desde el mismo origen (para subir fotos de productos);
          // micrófono / geolocalización / etc. bloqueados.
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
