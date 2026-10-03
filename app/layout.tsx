import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Femtech Coach',
  description: 'CRM для фитнес-тренера',
  icons: {
    icon: '/femtech-icon.png',
    apple: '/femtech-icon.png',
    shortcut: '/femtech-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Femtech',
  },
};

export const viewport: Viewport = {
  themeColor: '#FF4A1C',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="bg-black text-white">{children}</body>
    </html>
  );
}