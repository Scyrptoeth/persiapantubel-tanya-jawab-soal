import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Persiapantubel Tanya Jawab Soal',
    short_name: 'Persiapantubel',
    description: 'Aplikasi Tutor Tanya Jawab Soal TPA & TBI Persiapantubel',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/favicon.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}
