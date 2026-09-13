import type { MetadataRoute } from 'next';
import { guides } from '@/lib/learn-content';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: '', priority: 1 },
    { path: '/tracker', priority: 0.95 },
    { path: '/learn', priority: 0.9 },
    { path: '/account', priority: 0.8 },
    { path: '/wallet', priority: 0.85 },
    { path: '/market', priority: 0.6 },
    { path: '/giveaway-rules', priority: 0.45 },
    ...guides.map((guide) => ({ path: `/learn/${guide.slug}`, priority: 0.75 })),
  ];

  return routes.map(({ path, priority }) => ({
    url: `https://skooby.app${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority,
  }));
}
