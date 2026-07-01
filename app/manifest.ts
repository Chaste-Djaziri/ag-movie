import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Agasobanuye Movies - Stream Movies & TV Shows Online',
    short_name: 'Agasobanuye Movies',
    description: 'Agasobanuye Movies - Your premier destination for streaming the latest movies and TV shows online in HD quality.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#0071eb',
    icons: [
      {
        src: '/image.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/image.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    categories: ['entertainment', 'video', 'movies', 'tv', 'streaming', 'agasobanuye'],
    lang: 'en',
    orientation: 'portrait',
  }
}
