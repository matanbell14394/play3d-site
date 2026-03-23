import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://play3d.co.il', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: 'https://play3d.co.il/materials', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://play3d.co.il/accessibility', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: 'https://play3d.co.il/privacy', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];
}
