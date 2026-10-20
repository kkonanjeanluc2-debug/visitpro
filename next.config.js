/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  buildExcludes: [
    /app-build-manifest\.json$/,
    /middleware-manifest\.json$/,
    /middleware-build-manifest\.js$/,
  ],
  // Désactiver complètement le runtime caching de Workbox pour les pages
  // et les API — seuls les assets statiques versionnés sont mis en cache.
  runtimeCaching: [
    // ── Assets versionnés Next.js (/next/static/) ──────────────────────────
    // Ces fichiers ont un hash dans leur nom → CacheFirst est sûr.
    {
      urlPattern: /\/_next\/static\/.+$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static-assets',
        expiration: { maxEntries: 300, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    // ── Images optimisées Next.js ──────────────────────────────────────────
    {
      urlPattern: /\/_next\/image\?/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-image',
        expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    // ── Fonts Google ──────────────────────────────────────────────────────
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    // ── API routes et pages HTML : JAMAIS en cache ─────────────────────────
    // NetworkOnly = réseau direct, aucun fallback cache.
    // Cela inclut /api/*, /dashboard, /display/*, /secretaire/*, etc.
    {
      urlPattern: /^https?:\/\/.+$/i,
      handler: 'NetworkOnly',
    },
  ],
})

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Identifiant de version, identique côté client et serveur pour un même build.
  // L'écran d'affichage se recharge quand il diffère (nouveau déploiement).
  env: {
    NEXT_PUBLIC_BUILD_STAMP: process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now()),
  },
  async headers() {
    return [
      {
        // Pas d'en-tête Refresh : un rechargement périodique coupe le son sur les
        // TV connectées (le navigateur exige un geste pour réactiver l'audio).
        source: '/display/:token*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
          { key: 'Pragma',        value: 'no-cache' },
        ],
      },
    ]
  },
}

module.exports = withPWA(nextConfig)
