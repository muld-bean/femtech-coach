import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Femtech Coach',
    short_name: 'Femtech',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#FF4A1C',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}