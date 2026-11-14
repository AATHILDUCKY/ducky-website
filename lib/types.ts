export type Profile = {
  name: string;
  handle: string;
  role: string;
  company: string;
  location: string;
  email: string;
  github: string;
  linkedin: string;
  youtube?: string;
  instagram?: string;
  x?: string;
  bio: string;
  availability: string;
  portrait: string;
  articleAuthor?: { name: string; portrait: string };
  skills: string[];
  experience: { role: string; company: string; dates: string; description: string }[];
};
export type SeoSettings = { title: string; description: string; googleVerification: string };
export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  status: 'draft' | 'published';
  seo_title: string;
  seo_description: string;
  cover_id: string | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type PostSummary = Omit<Post, 'content'> & { read_time: number };
