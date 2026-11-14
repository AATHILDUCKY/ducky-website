import { journalHomepage } from './homepage-journal.mjs';
import { defaultWriteups, upgradeHomepage } from './homepage-migration.mjs';
/** Seed data for the compact visual editor. Existing profile edits are respected. */
export function createHomepageDefaults(profile, reference) {
  const nav = [
    ['/', 'Home'],
    ['/about', 'About'],
    ['/tools', 'Tools'],
    ['/blog', 'Writeups'],
  ].map(([href, label], i) => ({ id: 'nav-' + i, href, label }));
  const link = (label, href, id = 'link') => ({ id, label, href });
  const baseline = reference?.baseline?.profile;
  const originalDescriptions = [
    'Testing enterprise platforms, IAM/IAG, and backend APIs. Investigating vulnerabilities and collaborating with engineers on validation and remediation.',
    'Delivered 10+ projects, including websites, POS software, and custom business systems, with full-stack development, integrations, and SEO.',
    'Built and maintained WordPress and Django applications, custom features, and plugins, with backend development and production support.',
  ];
  const experience = profile.experience.map((e, i) => ({
    id: 'experience-' + i,
    ...e,
    dates: e.dates.toUpperCase(),
    description:
      baseline && JSON.stringify(profile.experience) === JSON.stringify(baseline.experience)
        ? originalDescriptions[i] || e.description
        : e.description,
  }));
  return journalHomepage(
    upgradeHomepage({
      version: 3,
      branding: {
        name: 'AATHIL DUCKY',
        font: 'system',
        fontWeight: 700,
        logo: '/reference/ducky-badge.webp',
        logoAlt: '',
        homeLabel: profile.name + ' home',
      },
      navigation: { items: nav, contact: { enabled: true, label: "Let's talk", href: '/contact' } },
      footer: {
        copyright: '© {year} ' + profile.name + '. Built with intention.',
        links: [...nav, { id: 'nav-contact', label: 'Contact', href: '/contact' }],
        backToTop: 'Back to top',
        showBackToTop: true,
      },
      order: ['hero', 'highlights', 'about', 'experience', 'tools', 'writeups', 'contact'],
      hero: {
        enabled: true,
        eyebrow: 'Cybersecurity enthusiast · Security Engineer',
        heading: 'I’m ' + profile.handle + '.',
        accentHeading: 'Security Engineer.',
        description:
          'At **' +
          profile.company +
          '**, I focus on **penetration testing, IAM, and IAG security**. I build practical tools and automate repetitive tasks to make security work more effective.',
        learningLabel: 'Currently learning',
        learningText: 'Security architecture & design and cloud platform security.',
        buttons: [
          { ...link('Explore my tools', '/tools', 'hero-tools'), style: 'primary', icon: 'arrow' },
          {
            ...link('A little about me', '/about', 'hero-about'),
            style: 'secondary',
            icon: 'right',
          },
        ],
        location: 'Based in ' + profile.location,
        note: 'Building. Testing. Always learning.',
        portrait: {
          visible: true,
          src: profile.portrait,
          alt: profile.name,
          topLabel: 'THE PERSON BEHIND THE WORK',
          index: '01 / AA',
          name: profile.name,
          subtitle: 'Security Engineer · ' + profile.company,
          tags: [
            'Security Engineer',
            'IAM & IAG',
            'Pentesting',
            'Full-Stack Developer',
            'SEO',
            'Content Creator',
          ],
        },
      },
      highlights: {
        enabled: true,
        label: 'Security research and experience highlights',
        items: [
          {
            id: 'highlight-vulnerabilities',
            value: '100+',
            suffix: '',
            label: 'Vulnerabilities identified',
            context: 'Across identity, learning & enterprise platforms',
          },
          {
            id: 'highlight-security',
            value: '1+',
            suffix: 'yr',
            label: 'Hands-on security experience',
            context: 'Research through remediation support',
          },
          {
            id: 'highlight-development',
            value: '3+',
            suffix: 'yrs',
            label: 'Development experience',
            context: 'Web applications, backend systems & integrations',
          },
        ],
      },
      about: {
        enabled: true,
        eyebrow: '01 / ABOUT',
        heading: 'Security Engineer\n& Developer.',
        paragraphs: [
          "I'm **" +
            profile.name +
            '**, a Security Engineer at ' +
            profile.company +
            ' with **3+ years of development experience**. I combine penetration testing and IAM/IAG security with hands-on experience building web, backend, and desktop applications.',
          "Alongside my security work, I've completed **10+ freelance projects** and create content part-time to share what I learn.",
        ],
        tags: ['IAM / IAG', 'React.js & Node.js', 'Python & Go', 'Desktop development'],
        link: link('More about me & my experience', '/about', 'about-link'),
      },
      experience: {
        enabled: true,
        eyebrow: '02 / EXPERIENCE',
        heading: 'An engineering foundation.\nA focus on security.',
        description:
          'From building applications to testing the systems behind them, my work connects development with practical security.',
        link: link('Full experience & qualifications', '/about/#experience', 'experience-link'),
        items: experience,
      },
      tools: {
        enabled: true,
        eyebrow: '03 / ONLINE TOOLS',
        heading: 'Small tools.\nPractical security work.',
        link: link('Explore all tools', '/tools', 'tools-link'),
        items: [
          {
            id: 'tool-jwt',
            title: 'JWT Token Analyzer',
            description:
              'Inspect JWT headers, payloads, and signatures for authentication research.',
            href: '/tools/#jwt-token-analyzer',
            icon: 'key',
          },
          {
            id: 'tool-secrets',
            title: 'Client Site Secret Finder',
            description: 'Find exposed secrets and sensitive patterns in client-side website code.',
            href: '/tools/#client-site-secret-finder',
            icon: 'search',
          },
        ],
      },
      writeups: structuredClone(defaultWriteups),
      contact: {
        enabled: true,
        eyebrow: '05 / GET IN TOUCH',
        heading: "Let's build",
        accentHeading: 'something useful.',
        description:
          "Have a security question, a collaboration idea, or a development project? I'd be happy to hear from you.",
        email: profile.email,
        emailLabel: '',
        link: link('Contact details & social links', '/contact', 'contact-link'),
      },
    }),
    profile,
  );
}
