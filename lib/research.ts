import type { PostSummary } from './types';
// Research is a view of published writing, managed with the existing post editor.
export function isResearchPost(post: Pick<PostSummary, 'category' | 'tags'>) {
  return /research|security|pentest|vulnerability|iam|iag/i.test(
    [post.category, ...post.tags].join(' '),
  );
}
export const researchAreas = [
  {
    title: 'Identity & access security',
    label: 'IDENTITY',
    description:
      'Authentication, authorization, and access-control research across IAM and IAG platforms.',
    topics: ['IAM / IAG', 'Access control', 'Authentication'],
    tone: 0,
  },
  {
    title: 'Web & API security',
    label: 'APPLICATIONS',
    description:
      'Understanding how applications fail, validating vulnerabilities, and supporting practical remediation.',
    topics: ['Penetration testing', 'API security', 'Code review'],
    tone: 1,
  },
  {
    title: 'Security tooling & automation',
    label: 'ENGINEERING',
    description:
      'Small, focused tools that make reconnaissance, secret discovery, and research workflows more effective.',
    topics: ['Python & Go', 'Reconnaissance', 'Open source'],
    tone: 2,
  },
];
