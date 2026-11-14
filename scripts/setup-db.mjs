import pg from 'pg';
import { installForum } from './forum-data.mjs';
import { installReference } from './reference-data.mjs';
import { installHomepage } from './homepage-data.mjs';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const db = await pool.connect();
try {
  await db.query('BEGIN');
  await db.query(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  await installForum(db);
  const source = JSON.parse(
    await readFile(new URL('../db/source-snapshot.json', import.meta.url), 'utf8'),
  );
  await db.query('INSERT INTO settings(key,value) VALUES ($1,$2) ON CONFLICT DO NOTHING', [
    'source',
    JSON.stringify(source),
  ]);
  const profile = {
    name: 'Aathil Ahamed',
    handle: 'aathilducky',
    role: 'Security Engineer & Full-Stack Developer',
    company: 'Welford Systems',
    location: 'Sri Lanka',
    email: 'aathilducky@gmail.com',
    github: 'https://github.com/AATHILDUCKY',
    linkedin: 'https://www.linkedin.com/in/aathil-ducky-95b12a218/',
    bio: 'I work at the intersection of security and software. As a Security Engineer at Welford Systems, I focus on penetration testing, IAM, IAG, and web and API security. Alongside that, I build practical tools and thoughtful web applications — turning complex problems into useful, simple experiences.',
    availability: 'Open to collaborations',
    portrait: '/portrait.webp',
    skills: [
      'React',
      'Next.js',
      'Node.js',
      'Python',
      'Go',
      'PostgreSQL',
      'Electron',
      'IAM / IAG',
      'Burp Suite',
      'Linux',
      'AWS',
      'Microsoft Azure',
      'Linux hardening',
      'API integrations',
      'Secure code review',
      'Vulnerability remediation',
      'Authentication & authorization',
      'AI-assisted workflows',
      'SEO',
    ],
    experience: [
      {
        role: 'Security Engineer',
        company: 'Welford Systems',
        dates: 'Jul 2025 — Present',
        description:
          'Testing enterprise platforms, identity and access security, and backend APIs. Working with engineers to validate findings and support remediation.',
      },
      {
        role: 'Freelance Web Developer',
        company: 'Independent · Part-time',
        dates: '2022 — Present',
        description:
          '10+ projects across websites, point-of-sale software, custom business systems, integrations, and SEO.',
      },
      {
        role: 'Web Developer',
        company: 'CBS Solution (Pvt) Ltd',
        dates: 'Oct 2022 — Dec 2024',
        description:
          'Built and maintained WordPress and Django applications, custom features, plugins, and backend systems.',
      },
    ],
  };
  // The downloaded portrait is persisted in PostgreSQL; public copy is a first-load fallback.
  try {
    const image = await readFile(new URL('../public/portrait.webp', import.meta.url));
    if (image.length >= 50000) throw new Error('Portrait exceeds image budget');
    const meta = await sharp(image).metadata();
    const exists = await db.query("SELECT value FROM settings WHERE key='profile'");
    if (!exists.rowCount) {
      const result = await db.query(
        'INSERT INTO media(data,alt,width,height) VALUES($1,$2,$3,$4) RETURNING id',
        [image, 'Aathil Ahamed', meta.width, meta.height],
      );
      profile.portrait = '/media/' + result.rows[0].id;
    }
  } catch (error) {
    console.warn('Portrait import skipped:', error.message);
  }
  await db.query('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT DO NOTHING', [
    'profile',
    JSON.stringify(profile),
  ]);
  await db.query('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT DO NOTHING', [
    'seo',
    JSON.stringify({
      title: 'Aathil Ahamed — Security Engineer & Developer',
      description:
        'Security engineering, thoughtful software, and notes from the process. Explore tools and writing by Aathil Ahamed, based in Sri Lanka.',
      googleVerification: '',
    }),
  ]);
  await db.query(
    `INSERT INTO posts(slug,title,excerpt,content,category,tags,status,published_at) VALUES($1,$2,$3,$4,$5,$6,'published',now()) ON CONFLICT(slug) DO NOTHING`,
    [
      'building-testing-always-learning',
      'Building. Testing. Always learning.',
      'A little about the work I do, the tools I build, and what I’m learning along the way.',
      '## A space for the process\n\nI’m Aathil Ahamed, a Security Engineer and Full-Stack Developer based in Sri Lanka. I work on penetration testing, identity and access security, and practical tools that make everyday work a little easier.\n\n## From building to testing\n\nMy background is in web development, backend systems, and integrations. At Welford Systems, I bring that experience into application security and IAM/IAG research. Understanding how a system is built helps me ask better questions about how it can fail.\n\n## Small tools, useful outcomes\n\nMy projects include Duck Leak Scanner, Subdomain Status Monitor, and Ducky Pwn Docs. They reflect the same idea: build something practical around a real problem.\n\n## What comes next\n\nI’m learning more about security architecture, cloud platform security, and engineering practices. This space is where I’ll share project notes and what I learn along the way.\n\n*This introduction was adapted from the biography on [my existing portfolio](https://aathilducky.com/about/). Future articles will appear here as I publish them.*',
      'Personal',
      ['Behind the work', 'Learning'],
    ],
  );
  await installReference(db);
  await installHomepage(db);
  await db.query('COMMIT');
  console.log(
    'Database ready. Imported profile, source snapshots, and an introductory post. Existing content preserved.',
  );
} catch (error) {
  await db.query('ROLLBACK');
  console.error(error.message);
  process.exitCode = 1;
} finally {
  db.release();
  await pool.end();
}
