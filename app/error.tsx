'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="error-page">
      <span className="eyebrow">A SMALL INTERRUPTION</span>
      <h1>
        Let’s try that again<span className="accent">.</span>
      </h1>
      <p>Something interrupted this page. Your saved work is still in the database.</p>
      <button className="button button-dark" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
