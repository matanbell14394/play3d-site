import type { Metadata } from 'next';
import prisma from '@/lib/prisma/prisma';
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  title: 'PLAY3D | הדפסות תלת מימד מקצועיות',
  description: 'שירות הדפסות תלת מימד מקצועי בטבעון. FDM — PLA, PETG, ABS, TPU. מעל 500 פרויקטים מוצלחים. הזמינו עכשיו!',
  keywords: ['הדפסות תלת מימד', 'דפוס 3D', 'FDM', 'PLA', 'PETG', 'טבעון', 'ישראל', '3D printing', 'play3d'],
  openGraph: {
    title: 'PLAY3D | הדפסות תלת מימד מקצועיות',
    description: 'שירות הדפסות תלת מימד מקצועי — FDM, חומרים איכותיים, מסירה מהירה. טבעון, ישראל.',
    url: 'https://play3d.co.il',
    siteName: 'PLAY3D',
    locale: 'he_IL',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PLAY3D | הדפסות תלת מימד',
    description: 'שירות הדפסות תלת מימד מקצועי בטבעון ישראל',
  },
  alternates: { canonical: 'https://play3d.co.il' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'PLAY3D',
  description: 'שירות הדפסות תלת מימד מקצועי — FDM, PLA, PETG, ABS, TPU',
  url: 'https://play3d.co.il',
  telephone: '+972-52-6018145',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'טבעון',
    addressCountry: 'IL',
  },
  priceRange: '₪₪',
  openingHoursSpecification: [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Sunday','Monday','Tuesday','Wednesday','Thursday'], opens: '09:00', closes: '18:00' },
  ],
  hasMap: 'https://maps.google.com/?q=טבעון,ישראל',
  sameAs: [],
};

export default async function HomePage() {
  const galleryItems = await prisma.galleryProject.findMany({
    orderBy: { createdAt: 'desc' },
    take: 16,
    select: { id: true, title: true, description: true, imageUrl: true, images: true },
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient initialGallery={galleryItems} />
    </>
  );
}
