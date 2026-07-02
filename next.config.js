/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
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
  // PDFKit doit rester dans node_modules (pas bundlé) pour trouver ses .afm
  serverExternalPackages: ['pdfkit'],
  // Inclure tout le répertoire pdfkit dans le déploiement Vercel
  outputFileTracingIncludes: {
    '**': ['./node_modules/pdfkit/**/*'],
  },
}

module.exports = withPWA(nextConfig)
