import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: '', priority: 1 },
    { path: '/wallet', priority: 0.9 },
    { path: '/market', priority: 0.9 },
    { path: '/casino', priority: 0.6 },
  ];

  return routes.map(({ path, priority }) => ({
    url: `https://skooby.app${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority,
  }));
}
