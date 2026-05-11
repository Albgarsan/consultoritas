import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Consultoritas - Portal de Cliente',
  description: 'Tu asesoría fiscal de confianza. Gestiona tus documentos, impuestos y consultas con IA.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}
