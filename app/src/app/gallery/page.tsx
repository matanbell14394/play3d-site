import SiteNav from '@/components/SiteNav';
import GalleryClient from './GalleryClient';
import prisma from '@/lib/prisma/prisma';

export const metadata = { title: 'גלריה | PLAY3D', description: 'גלריית פרויקטים — עבודות הדפסת תלת מימד של PLAY3D' };

export default async function GalleryPage() {
  const items = await prisma.galleryProject.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, description: true, imageUrl: true, images: true, category: true },
  });
  return (
    <>
      <SiteNav active="gallery" />
      <GalleryClient items={items} />
    </>
  );
}
