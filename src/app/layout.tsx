import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Namahaa Tiffin Room | Premium Digital QR Menu & South Indian Heritage',
  description: 'Experience authentic South Indian flavours at Namahaa Tiffin Room. Scan table QR code for Benne Dosas, Ghee Thatte Idlis, Pesarattu & traditional tiffins.',
  keywords: 'Namahaa Tiffin Room, South Indian Restaurant, Digital Menu, QR Menu, Benne Dosa, Thatte Idly, Millet Dosa, Sambar Vada, Ghee Pongal',
  authors: [{ name: 'Namahaa Tiffin Room' }],
  openGraph: {
    title: 'Namahaa Tiffin Room | Premium Digital QR Menu',
    description: 'Experience authentic South Indian flavours. Explore our digital QR menu.',
    url: 'https://namahaatiffinroom.com',
    siteName: 'Namahaa Tiffin Room',
    images: [
      {
        url: '/logo-banner.svg',
        width: 800,
        height: 240,
        alt: 'Namahaa Tiffin Room Banner',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Namahaa Tiffin Room | Premium Digital Menu',
    description: 'Experience authentic South Indian flavours on our digital QR menu.',
    images: ['/logo-banner.svg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

import { ThemeProvider } from '@/lib/theme';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: 'Namahaa Tiffin Room',
    image: 'https://namahaatiffinroom.com/logo-circle.svg',
    description: 'Premium South Indian Tiffin Room serving authentic Ghee Thatte Idli, Benne Dosa, Pesarattu, and Millet Dosas.',
    servesCuisine: 'South Indian, Vegetarian',
    priceRange: '₹',
    telephone: '+91 98765 43210',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'IN',
      addressLocality: 'South Indian District',
      streetAddress: 'Main Road, Near Heritage Hub',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '07:00',
        closes: '12:30',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '16:30',
        closes: '22:30',
      },
    ],
  };

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="icon" href="/logo-circle.svg" type="image/svg+xml" />
      </head>
      <body className="antialiased selection:bg-namaha-gold selection:text-namaha-green-deep min-h-screen flex flex-col justify-between bg-namaha-green-cream dark:bg-namaha-green-deep text-namaha-green-deep dark:text-white transition-colors duration-300">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
