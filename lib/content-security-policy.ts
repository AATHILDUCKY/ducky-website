/** Next's development bundles need eval; production bundles do not. */
export function contentSecurityPolicy(development: boolean) {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ''} https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://www.googletagmanager.com https://*.google-analytics.com",
    "font-src 'self'",
    "connect-src 'self' https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com",
    "frame-src 'self' https://www.instagram.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}
