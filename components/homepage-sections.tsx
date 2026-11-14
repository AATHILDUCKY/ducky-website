import { Fragment, type CSSProperties } from 'react';
import type { PostSummary } from '@/lib/types';
import type { HeroSocialProfile } from '@/lib/social-links';
import { WriteupCard } from './writeup-card';
import { HeroSocialLinks } from './hero-social-links';
import { landingHomepage } from '@/lib/homepage-art-direction';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Box,
  BriefcaseBusiness,
  CalendarDays,
  Code2,
  Globe2,
  KeyRound,
  Mail,
  MapPin,
  PenLine,
  Search,
  ShieldCheck,
  Terminal,
  UserRound,
  Wrench,
  AudioLines,
  Sparkles,
  Building2,
  Fingerprint,
} from 'lucide-react';
import type { Homepage } from '@/lib/homepage-schema';
const homeIconComponents = {
  arrow: ArrowUpRight,
  right: ArrowRight,
  key: KeyRound,
  search: Search,
  shield: ShieldCheck,
  code: Code2,
  command: Terminal,
  globe: Globe2,
  book: BookOpen,
  mail: Mail,
  cube: Box,
  briefcase: BriefcaseBusiness,
  user: UserRound,
  wrench: Wrench,
};
function Icon({ name }: { name: string }) {
  const Graphic = homeIconComponents[name as keyof typeof homeIconComponents] || ArrowUpRight;
  return <Graphic aria-hidden="true" className="icon" strokeWidth={1.75} />;
}
function SectionLabel({ text, icon }: { text: string; icon: string }) {
  return (
    <p className="section-index">
      <span className="home-section-mark">
        <Icon name={icon} />
      </span>
      {text}
    </p>
  );
}
function Headline({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, index) => (
        <span key={index}>
          <HomeText text={line} />
        </span>
      ))}
    </>
  );
}
function FocusIcon({ tag }: { tag: string }) {
  const TagIcon = /creator|content|write|seo/i.test(tag)
    ? PenLine
    : /IAM|IAG|identity/i.test(tag)
      ? KeyRound
      : /pentest/i.test(tag)
        ? Search
        : /security/i.test(tag)
          ? ShieldCheck
          : /develop|code|stack/i.test(tag)
            ? Code2
            : BookOpen;
  return <TagIcon size={16} strokeWidth={1.75} aria-hidden="true" />;
}
function LearningNote({ label, text }: { label: string; text: string }) {
  if (!label && !text) return null;
  return (
    <div className="journal-learning">
      <BookOpen size={20} aria-hidden="true" />
      <div>
        {label && <span>{label}</span>}
        <p>
          <HomeText text={text} />
        </p>
      </div>
    </div>
  );
}
function highlightIcon(label: string) {
  if (/vulnerab|research/i.test(label)) return 'shield';
  if (/develop|software/i.test(label)) return 'code';
  if (/security|identity/i.test(label)) return 'key';
  return 'globe';
}
/** Plain text and **bold** only; saved content never executes HTML. */
export function HomeText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, lineIndex) => (
        <Fragment key={lineIndex}>
          {lineIndex > 0 && <br />}
          {line
            .split(/(\*\*[^*]+\*\*)/g)
            .map((part, i) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={i}>{part.slice(2, -2)}</strong>
              ) : (
                <Fragment key={i}>{part}</Fragment>
              ),
            )}
        </Fragment>
      ))}
    </>
  );
}
function TextLink({
  link,
  icon = 'arrow',
}: {
  link: { label: string; href: string };
  icon?: string;
}) {
  return (
    <a className="text-link" href={link.href}>
      {link.label} <Icon name={icon} />
    </a>
  );
}
function Tags({ items }: { items: string[] }) {
  return (
    <div className="home-skill-tags">
      {items.map((tag, i) => (
        <span key={i}>
          <Icon
            name={/IAM|IAG|security/i.test(tag) ? 'key' : /desktop/i.test(tag) ? 'cube' : 'code'}
          />
          {tag}
        </span>
      ))}
    </div>
  );
}
export function HomepageSections({
  data: savedData,
  availability = '',
  posts = [],
  profile,
}: {
  data: Homepage;
  availability?: string;
  posts?: PostSummary[];
  profile?: HeroSocialProfile;
}) {
  const data = landingHomepage(savedData);
  return (
    <>
      {data.order
        .filter((key) => data[key].enabled)
        .map((key) => {
          switch (key) {
            case 'hero': {
              const s = data.hero;
              return (
                <section
                  key={key}
                  className={`hero container${s.portrait.visible ? '' : ' hero-no-portrait'}`}
                  id="home"
                  data-home-section={key}
                  data-availability={availability}
                  aria-labelledby="hero-heading"
                >
                  <div className="hero-poster-wordmark" aria-hidden="true">
                    <span>AATHIL</span>
                    <span>
                      DUC<span className="poster-wordmark-ending">KY</span>
                      <span className="poster-wordmark-star">✳</span>
                    </span>
                  </div>
                  <div className="hero-grid grid items-center">
                    <div className="journal-intro">
                      <p className="eyebrow">
                        <span className="status-dot" aria-hidden="true" />
                        {s.eyebrow}
                      </p>
                      <p className="hero-greeting">
                        Hey, I’m Aathil <span aria-hidden="true">↗</span>
                      </p>
                      <h1 id="hero-heading">
                        {s.heading && (
                          <>
                            <HomeText text={s.heading} />
                            <br />
                          </>
                        )}
                        <span>
                          <HomeText text={s.accentHeading} />
                        </span>
                      </h1>
                      <p className="hero-copy">
                        <HomeText text={s.description} />
                      </p>
                      <LearningNote label={s.learningLabel} text={s.learningText} />
                      <div className="hero-actions flex flex-wrap items-center gap-3">
                        {s.buttons.map((button) => (
                          <a
                            key={button.id}
                            className={`button${button.style === 'primary' ? ' button-primary' : ''}`}
                            href={button.href}
                          >
                            {button.label}
                            <Icon name={button.icon} />
                          </a>
                        ))}
                      </div>
                      <div className="hero-footer">
                        {s.location && (
                          <span>
                            <MapPin size={16} strokeWidth={1.75} aria-hidden="true" /> {s.location}
                          </span>
                        )}
                        {s.location && s.note && <span className="divider" aria-hidden="true" />}
                        {s.note && (
                          <span className="home-note">
                            <PenLine size={16} strokeWidth={1.75} aria-hidden="true" />
                            {s.note}
                          </span>
                        )}
                      </div>
                      <div className="hero-availability">
                        <span className="status-dot" aria-hidden="true" />
                        {availability || 'Let’s connect over a good idea'}
                        <span className="hero-availability-line" aria-hidden="true" />
                      </div>
                    </div>
                    {s.portrait.visible && (
                      <aside className="profile-visual" aria-label={s.portrait.name}>
                        <div className="signature-stage">
                          <div className="signature-orbit" aria-hidden="true" />
                          <span className="visual-code visual-code-top" aria-hidden="true">
                            &lt;curiosity /&gt;
                          </span>
                          <img
                            className="signature-avatar"
                            src="/brand/aathil-ducky-avatar.webp"
                            alt="Aathil Ducky’s illustrated signature logo"
                            width={800}
                            height={800}
                            fetchPriority="high"
                            decoding="async"
                          />
                          <span className="visual-sticker">
                            <ShieldCheck size={17} aria-hidden="true" /> HACK WITH PURPOSE.
                          </span>
                          <span className="visual-code visual-code-bottom" aria-hidden="true">
                            01 — ALWAYS EXPLORING
                          </span>
                        </div>
                        <ul className="profile-tags" aria-label="Professional focus">
                          {s.portrait.tags.map((tag, i) => (
                            <li key={i}>
                              <FocusIcon tag={tag} />
                              {tag}
                            </li>
                          ))}
                        </ul>
                        <div className="profile-caption">
                          {s.portrait.src && (
                            <img
                              className="signature-person"
                              src={s.portrait.src}
                              alt={s.portrait.alt}
                              width={42}
                              height={42}
                              loading="lazy"
                            />
                          )}
                          <div>
                            <h2>{s.portrait.name}</h2>
                            <p>{s.portrait.subtitle}</p>
                          </div>
                          <span className="signature-caption-mark" aria-hidden="true">
                            AD<span>↗</span>
                          </span>
                        </div>
                        {profile && <HeroSocialLinks profile={profile} />}
                      </aside>
                    )}
                  </div>
                  <div className="discipline-strip" aria-label="Areas of focus">
                    <span>
                      <ShieldCheck size={17} aria-hidden="true" /> ETHICAL HACKING
                    </span>
                    <span className="strip-star" aria-hidden="true">
                      ✳
                    </span>
                    <span>
                      <Terminal size={17} aria-hidden="true" /> SECURITY RESEARCH
                    </span>
                    <span className="strip-star" aria-hidden="true">
                      ✳
                    </span>
                    <span>
                      <Code2 size={17} aria-hidden="true" /> BUILDING TOOLS
                    </span>
                    <span className="strip-star" aria-hidden="true">
                      ✳
                    </span>
                    <span>
                      <AudioLines size={17} aria-hidden="true" /> CREATING CONTENT
                    </span>
                  </div>
                </section>
              );
            }
            case 'highlights': {
              const s = data.highlights;
              return (
                <section
                  key={key}
                  className="home-highlights"
                  data-home-section={key}
                  aria-label={s.label}
                >
                  <div className="container">
                    <div
                      className="impact-strip"
                      style={
                        { '--highlight-columns': Math.min(s.items.length || 1, 4) } as CSSProperties
                      }
                    >
                      {s.items.map((item) => (
                        <div className="impact-stat" key={item.id}>
                          <div className="impact-stat-top">
                            <div className="impact-value">
                              {item.value}
                              {item.suffix && (
                                <>
                                  {' '}
                                  <span style={{ fontSize: '.55em' }}>{item.suffix}</span>
                                </>
                              )}
                            </div>
                            <span className="home-metric-icon">
                              <Icon name={highlightIcon(item.label)} />
                            </span>
                          </div>
                          <p className="impact-label">
                            <strong>{item.label}</strong>
                            <span className="impact-context">{item.context}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              );
            }
            case 'about': {
              const s = data.about;
              return (
                <section
                  key={key}
                  id="home-about"
                  className="section container home-overview"
                  data-home-section={key}
                  aria-labelledby="home-about-heading"
                >
                  <div className="home-about-grid">
                    <div>
                      <SectionLabel text={s.eyebrow} icon="user" />
                      <h2 className="section-title editorial-heading" id="home-about-heading">
                        <Headline text={s.heading} />
                      </h2>
                      <div className="about-signature">
                        {data.hero.portrait.visible && data.hero.portrait.src && (
                          <img
                            src={data.hero.portrait.src}
                            alt={data.hero.portrait.alt}
                            width={56}
                            height={56}
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                        <div>
                          <strong>{data.hero.portrait.name}</strong>
                          <span>{data.hero.portrait.subtitle}</span>
                        </div>
                        <Fingerprint size={30} aria-hidden="true" />
                      </div>
                    </div>
                    <div className="home-about-copy">
                      {s.paragraphs.map((text, i) => (
                        <p key={i}>
                          <HomeText text={text} />
                        </p>
                      ))}
                      <Tags items={s.tags} />
                      <TextLink link={s.link} />
                    </div>
                  </div>
                  <div className="creator-panel">
                    <div className="creator-art" aria-hidden="true">
                      <AudioLines size={42} strokeWidth={1.3} />
                      <span className="creator-art-words">
                        <span>LEARN.</span>
                        <span>CREATE.</span>
                        <span>REPEAT.</span>
                      </span>
                      <span className="creator-art-star">✳</span>
                    </div>
                    <div className="creator-copy">
                      <span className="creator-label">
                        <Sparkles size={14} aria-hidden="true" /> THE CREATOR SIDE
                      </span>
                      <h3>
                        Knowledge is better<span>when it’s shared.</span>
                      </h3>
                      <p>
                        I turn what I learn about security and technology into approachable content.
                        The discoveries, the process, and the lessons along the way.
                      </p>
                    </div>
                    <a href={data.writeups.link.href} className="creator-link">
                      Explore my content <ArrowUpRight size={20} aria-hidden="true" />
                    </a>
                  </div>
                  <LearningNote label={data.hero.learningLabel} text={data.hero.learningText} />
                </section>
              );
            }
            case 'experience': {
              const s = data.experience;
              return (
                <section
                  key={key}
                  id="home-experience"
                  className="section container home-experience"
                  data-home-section={key}
                  aria-labelledby="home-experience-heading"
                >
                  <div className="experience-heading-row">
                    <div className="home-experience-intro">
                      <SectionLabel text={s.eyebrow} icon="briefcase" />
                      <h2
                        className="section-title experience-heading editorial-heading"
                        id="home-experience-heading"
                      >
                        <Headline text={s.heading} />
                      </h2>
                    </div>
                    <div className="experience-overview">
                      <div className="experience-overview-mark" aria-hidden="true">
                        <BriefcaseBusiness size={24} />
                        <span>SECURITY × SOFTWARE</span>
                        <ArrowUpRight size={24} />
                      </div>
                      <p className="section-description">
                        <HomeText text={s.description} />
                      </p>
                      <TextLink link={s.link} />
                    </div>
                  </div>
                  <div className="experience-timeline">
                    {s.items.map((item, index) => (
                      <article
                        className={`experience-row${index === 0 ? ' experience-row-featured' : ''}`}
                        key={item.id}
                      >
                        <div className="experience-rail" aria-hidden="true">
                          <span className="experience-step">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                        </div>
                        <div className="experience-role-card">
                          <div className="experience-role-icon" aria-hidden="true">
                            <Icon
                              name={
                                /security/i.test(item.role)
                                  ? 'shield'
                                  : /freelance|independent/i.test(item.role)
                                    ? 'briefcase'
                                    : 'code'
                              }
                            />
                          </div>
                          <div className="experience-role-content">
                            <div className="experience-role-topline">
                              <p className="experience-date">
                                <CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" />
                                {item.dates}
                              </p>
                              {/present|current|ongoing/i.test(item.dates) && (
                                <span className="experience-state">
                                  <span aria-hidden="true" />
                                  Ongoing
                                </span>
                              )}
                            </div>
                            <h3>{item.role}</h3>
                            <p className="experience-company">
                              <Building2 size={17} strokeWidth={1.75} aria-hidden="true" />
                              {item.company}
                            </p>
                          </div>
                          <p className="experience-detail">
                            <HomeText text={item.description} />
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            }
            case 'tools': {
              const s = data.tools;
              return (
                <section
                  key={key}
                  id="home-tools"
                  className="section home-tools-overview"
                  data-home-section={key}
                  aria-labelledby="home-tools-heading"
                >
                  <div className="container">
                    <div className="section-header">
                      <div>
                        <SectionLabel text={s.eyebrow} icon="wrench" />
                        <h2 className="section-title editorial-heading" id="home-tools-heading">
                          <Headline text={s.heading} />
                        </h2>
                      </div>
                      <TextLink link={s.link} />
                    </div>
                    <div className="home-tools-grid">
                      {s.items.map((item, index) => (
                        <a className="home-tool-link" href={item.href} key={item.id}>
                          <div className="home-tool-topline">
                            <span className="expertise-icon">
                              <Icon name={item.icon} />
                            </span>
                            <span className="home-tool-index">
                              UTILITY / {String(index + 1).padStart(2, '0')}
                            </span>
                            <ArrowUpRight
                              className="home-tool-arrow"
                              size={25}
                              aria-hidden="true"
                            />
                          </div>
                          <div className="home-tool-copy">
                            <h3>{item.title}</h3>
                            <p>
                              <HomeText text={item.description} />
                            </p>
                          </div>
                          <span className="home-tool-action">
                            Open tool <ArrowUpRight size={19} aria-hidden="true" />
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                </section>
              );
            }
            case 'writeups': {
              const s = data.writeups;
              if (!posts.length) return null;
              return (
                <section
                  key={key}
                  id="home-writeups"
                  className="section container home-writeups"
                  data-home-section={key}
                  aria-labelledby="home-writeups-heading"
                >
                  <div className="section-header">
                    <div>
                      <SectionLabel text={s.eyebrow} icon="book" />
                      <h2 id="home-writeups-heading" className="section-title editorial-heading">
                        <Headline text={s.heading} />
                      </h2>
                      <p className="section-description">{s.description}</p>
                    </div>
                    <a className="button" href={s.link.href}>
                      {s.link.label}
                      <Icon name="arrow" />
                    </a>
                  </div>
                  <div className="home-writeups-grid">
                    {posts.slice(0, s.count).map((post, index) => (
                      <WriteupCard key={post.id} post={post} index={index} />
                    ))}
                  </div>
                </section>
              );
            }
            case 'contact': {
              const s = data.contact;
              return (
                <section
                  key={key}
                  id="home-contact"
                  className="container home-contact-overview"
                  data-home-section={key}
                  aria-labelledby="home-contact-heading"
                >
                  <div className="home-contact-panel">
                    <div>
                      <SectionLabel text={s.eyebrow} icon="mail" />
                      <h2 id="home-contact-heading" className="editorial-heading">
                        <span>
                          <HomeText text={s.heading} />
                        </span>
                        <span>
                          <HomeText text={s.accentHeading} />
                        </span>
                      </h2>
                      <p>
                        <HomeText text={s.description} />
                      </p>
                    </div>
                    <div className="home-contact-actions">
                      <a className="contact-email" href={`mailto:${s.email}`}>
                        <Icon name="mail" />
                        <span>{s.emailLabel || s.email}</span>
                        <Icon name="arrow" />
                      </a>
                      <a className="home-contact-link" href={s.link.href}>
                        {s.link.label}
                        <Icon name="right" />
                      </a>
                    </div>
                  </div>
                </section>
              );
            }
          }
        })}
    </>
  );
}
