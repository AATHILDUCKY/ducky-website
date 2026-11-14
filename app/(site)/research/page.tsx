import Link from 'next/link';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { getPosts } from '@/lib/db';
import { isResearchPost } from '@/lib/research';
import { ResearchAreas } from '@/components/research-areas';
import { WritingList } from '@/components/writing-list';
export const metadata = {
  title: 'Security Research',
  description:
    'Explore Aathil Ahamed’s research interests in identity security, web and API security, and practical security tooling.',
  alternates: { canonical: '/research' },
};
export default async function Research() {
  const posts = await getPosts();
  const research = posts.filter(isResearchPost);
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">SECURITY RESEARCH & EXPLORATION</span>
        <h1>
          Look closer.
          <br />
          <span className="accent">Ask better questions.</span>
        </h1>
        <p>
          My work explores the space between how a system is designed
          <br className="desktop-break" /> and how it behaves. These are the areas I focus on.
        </p>
      </div>
      <ResearchAreas />
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FIELD NOTES</span>
            <h2>
              Research writing<span className="accent">.</span>
            </h2>
            <p>Published investigations, lessons, and technical notes.</p>
          </div>
          <Link className="text-link" href="/blog">
            All writing <ArrowUpRight size={17} />
          </Link>
        </div>
        {research.length ? (
          <WritingList posts={research} />
        ) : (
          <div className="research-empty">
            <span className="work-icon">
              <BookOpen size={25} />
            </span>
            <div>
              <h3>The investigation comes before the write-up.</h3>
              <p>
                Research articles will appear here as I publish them. In the meantime, explore the
                tools behind my work.
              </p>
            </div>
            <Link className="text-link" href="/tools">
              Explore the tools <ArrowUpRight size={17} />
            </Link>
          </div>
        )}
      </section>
      <section className="research-tools">
        <div>
          <span className="eyebrow">FROM RESEARCH TO PRACTICE</span>
          <h2>Tools for the process.</h2>
          <p>Browser-based tools for investigation, validation, and practical security research.</p>
        </div>
        <Link className="button" href="/tools">
          Explore tools <ArrowUpRight size={17} />
        </Link>
      </section>
    </>
  );
}
