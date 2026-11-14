export type ForumImage = { id: string; alt: string; width: number; height: number };
export type ForumPost = {
  id: string;
  slug: string;
  title: string;
  content: string;
  link_url: string;
  images: ForumImage[];
  status: 'published' | 'draft';
  created_at: string;
  updated_at: string;
  discussion_updated_at: string | null;
  revision: string;
  reply_count: number;
  like_count: number;
  liked: boolean;
  rank: number;
};
export type ForumReply = {
  id: string;
  post_id: string;
  parent_id: string | null;
  root_id: string;
  depth: number;
  child_count: number;
  hidden_by_parent: boolean;
  name: string;
  content: string;
  is_author: boolean;
  hidden: boolean;
  created_at: string;
};
export type ForumState = {
  success?: boolean;
  message?: string;
  count?: number;
  parentCount?: number | null;
  errors?: Record<string, string[]>;
};
