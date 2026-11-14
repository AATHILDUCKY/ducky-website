import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
export const runtime = 'nodejs';
export const alt = 'Aathil Ahamed — Security Engineer & Full-Stack Developer';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default async function Image() {
  const font = await readFile(join(process.cwd(), 'assets/fonts/JetBrainsMono-social.ttf'));
  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        background: 'linear-gradient(125deg, #122a2e, #090e17 55%, #231d37)',
        display: 'flex',
        flexDirection: 'column',
        padding: 80,
        color: '#e8f1fa',
        justifyContent: 'space-between',
        fontFamily: 'JetBrains Mono',
      }}
    >
      <div style={{ fontSize: 26, display: 'flex', color: '#7eeac5', letterSpacing: 3 }}>DUCKY</div>
      <div
        style={{
          fontSize: 54,
          fontWeight: 600,
          letterSpacing: -2,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <span>I’m aathilducky.</span>
        <span style={{ color: '#80ccff' }}>Security Engineer.</span>
        <span style={{ color: '#bba0ff', fontSize: 36, marginTop: 24 }}>
          Building. Testing. Always learning.
        </span>
      </div>
      <div style={{ fontSize: 18, display: 'flex', color: '#aebdd0' }}>
        Security Engineer · Full-Stack Developer · Sri Lanka
      </div>
    </div>,
    { ...size, fonts: [{ name: 'JetBrains Mono', data: font, weight: 600, style: 'normal' }] },
  );
}
