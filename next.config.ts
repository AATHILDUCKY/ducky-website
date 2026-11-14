import type { NextConfig } from 'next';
import { contentSecurityPolicy } from './lib/content-security-policy';
const config: NextConfig = {
  outputFileTracingIncludes: {
    '/opengraph-image': ['./assets/fonts/JetBrainsMono-social.ttf'],
    '/api/upload': ['./scripts/decode-heif.cjs', './node_modules/libheif-js/**/*'],
  },
  poweredByHeader: false,
  cacheMaxMemorySize: 10 * 1024 * 1024,
  experimental: { cpus: 1, serverActions: { bodySizeLimit: '512kb' } },
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy(process.env.NODE_ENV === 'development'),
          },
        ],
      },
    ];
  },
};
export default config;
