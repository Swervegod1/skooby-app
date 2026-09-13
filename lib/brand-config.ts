export type BrandConfig = {
  productName: string;
  accentHex: string;
  secondaryHex: string;
  logoText: string;
};

const brandByHost: Record<string, BrandConfig> = {
  'skooby.app': {
    productName: 'Skooby',
    accentHex: '#bef264',
    secondaryHex: '#f5d0fe',
    logoText: 'SKOOBY.APP',
  },
  'www.skooby.app': {
    productName: 'Skooby',
    accentHex: '#bef264',
    secondaryHex: '#f5d0fe',
    logoText: 'SKOOBY.APP',
  },
};

const fallback = brandByHost['skooby.app'];

export function getBrandConfig(hostHeader: string | null) {
  const hostname = (hostHeader ?? '').split(':')[0].toLowerCase();
  return brandByHost[hostname] ?? fallback;
}
