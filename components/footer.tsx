import Link from 'next/link';
import { ArrowUpRight, Github, Linkedin } from 'lucide-react';
import type { Profile } from '@/lib/types';
export function Footer({ profile }: { profile: Profile }) {
  return (
    <>
      <section className="contact-band">
        <div>
          <span className="eyebrow">LET’S CONNECT</span>
          <h2>
            A good conversation.
            <br />A better starting point<span className="accent">.</span>
          </h2>
          <p>Security research, useful software, or a shared idea. Let’s talk.</p>
        </div>
        <Link className="button button-dark" href="/contact">
          Start a conversation <ArrowUpRight size={17} />
        </Link>
      </section>
      <footer className="footer">
        <Link className="footer-name" href="/">
          aathilducky<span className="accent">.</span>
        </Link>
        <span>
          © {new Date().getFullYear()} {profile.name}
        </span>
        <div>
          <a href={profile.github} aria-label="GitHub">
            <Github size={17} />
          </a>
          <a href={profile.linkedin} aria-label="LinkedIn">
            <Linkedin size={17} />
          </a>
          <Link href="/feed.xml">
            RSS <ArrowUpRight size={13} />
          </Link>
          <Link href="/admin">
            Admin <ArrowUpRight size={13} />
          </Link>
        </div>
        <span className="footer-location">
          <i className="status-dot" />
          {profile.location}
        </span>
      </footer>
    </>
  );
}
