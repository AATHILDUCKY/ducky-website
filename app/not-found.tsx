import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="error-page">
      <span className="eyebrow">404 · A SMALL DETOUR</span>
      <h1>
        A little off the map<span className="accent">.</span>
      </h1>
      <p>This page may have moved, or the idea hasn’t made it here yet.</p>
      <Link className="button button-dark" href="/">
        Find your way home ↗
      </Link>
    </main>
  );
}
