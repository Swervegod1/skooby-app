import type { MetadataRoute } from 'next';
import { guides } from '@/lib/learn-content';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: '', priority: 1 },
    { path: '/tracker', priority: 0.95 },
    { path: '/learn', priority: 0.9 },
    { path: '/privacy', priority: 0.3 },
    { path: '/wallet', priority: 0.85 },
    { path: '/market', priority: 0.6 },
    ...guides.map((guide) => ({ path: `/learn/${guide.slug}`, priority: 0.75 })),
  ];

  return routes.map(({ path, priority }) => ({
    url: `https://skooby.app${path}`,
    lastModified: new Date('2026-10-31T00:00:00Z'),
    changeFrequency: 'weekly' as const,
    priority,
  }));
}

