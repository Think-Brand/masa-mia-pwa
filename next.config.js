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
};

module.exports = nextConfig;
