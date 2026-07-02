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
  // Inclure les fichiers de polices PDFKit dans les bundles serverless Vercel
  outputFileTracingIncludes: {
    '/api/test-pdf': ['./node_modules/pdfkit/js/data/**/*'],
    '/api/rapport-test': ['./node_modules/pdfkit/js/data/**/*'],
    '/api/cron/envoyer-rapports': ['./node_modules/pdfkit/js/data/**/*'],
  },
}

module.exports = withPWA(nextConfig)
