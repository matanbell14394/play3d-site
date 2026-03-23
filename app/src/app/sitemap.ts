import type { MetadataRoute } from 'next';
import prisma from '@/lib/prisma/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const gallery = await prisma.galleryProject.findMany({
    select: { id: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  const staticPages: MetadataRoute.Sitemap = [
    { url: 'https://play3d.co.il', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: 'https://play3d.co.il/materials', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://play3d.co.il/accessibility', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: 'https://play3d.co.il/privacy', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Future: if gallery items get individual pages, add them here
  // const galleryPages = gallery.map(item => ({
  //   url: `https://play3d.co.il/gallery/${item.id}`,
  //   lastModified: item.createdAt,
  //   priority: 0.6,
  // }));

  return staticPages;
}
