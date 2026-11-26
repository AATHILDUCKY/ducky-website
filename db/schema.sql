CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Retired project tables in existing databases are left untouched.
CREATE TABLE IF NOT EXISTS media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data bytea NOT NULL CHECK (octet_length(data) < 50000),
  alt text NOT NULL DEFAULT '',
  width integer NOT NULL,
  height integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'Notes',
  tags text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  cover_id uuid REFERENCES media(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_published_idx ON posts (published_at DESC) WHERE status = 'published';
CREATE TABLE IF NOT EXISTS login_attempts (
  key text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL UNIQUE,
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 100),
  email text NOT NULL CHECK (length(email) <= 254),
  subject text NOT NULL CHECK (length(subject) BETWEEN 3 AND 160),
  message text NOT NULL CHECK (length(message) BETWEEN 10 AND 5000),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','resolved','archived')),
  admin_note text NOT NULL DEFAULT '' CHECK (length(admin_note) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_requests_created_idx ON contact_requests (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS contact_requests_status_idx ON contact_requests (status, created_at DESC, id DESC);
CREATE TABLE IF NOT EXISTS contact_rate_limits (
  key text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);

-- Stable numeric ranges let sitemap files grow without shifting older URLs.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS sitemap_id bigint GENERATED ALWAYS AS IDENTITY;
CREATE UNIQUE INDEX IF NOT EXISTS posts_sitemap_id_idx ON posts (sitemap_id);

CREATE TABLE IF NOT EXISTS forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sitemap_id bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  title text NOT NULL CHECK (length(title) BETWEEN 3 AND 160),
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 20000),
  link_url text NOT NULL DEFAULT '' CHECK (length(link_url) <= 2000),
  images jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(images) = 'array' AND jsonb_array_length(images) <= 4),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published','draft')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  search_document tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', title), 'A') ||
    setweight(to_tsvector('simple', content), 'B') ||
    setweight(to_tsvector('simple', link_url), 'C')
  ) STORED
);
CREATE INDEX IF NOT EXISTS forum_posts_feed_idx ON forum_posts (created_at DESC, id DESC) WHERE status='published';
CREATE INDEX IF NOT EXISTS forum_posts_search_idx ON forum_posts USING GIN (search_document) WHERE status='published';
CREATE TABLE IF NOT EXISTS forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL UNIQUE,
  name text NOT NULL DEFAULT 'Guest' CHECK (length(name) BETWEEN 1 AND 80),
  content text NOT NULL CHECK (length(content) BETWEEN 2 AND 2000),
  is_author boolean NOT NULL DEFAULT false,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS forum_replies_post_idx ON forum_replies (post_id, created_at DESC, id DESC);
CREATE TABLE IF NOT EXISTS forum_reply_limits (
  key text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);

-- One-time counter backfill; later deploys do not scan the replies table.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='forum_posts' AND column_name='reply_count') THEN
    ALTER TABLE forum_posts ADD COLUMN reply_count integer NOT NULL DEFAULT 0 CHECK(reply_count>=0);
    UPDATE forum_posts p SET reply_count=(SELECT count(*) FROM forum_replies r WHERE r.post_id=p.id AND NOT hidden);
  END IF;
END $$;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0 CHECK(like_count>=0);
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS feed_score double precision GENERATED ALWAYS AS (
  extract(epoch FROM (created_at AT TIME ZONE 'UTC'))::double precision/3600.0 +
  8.0*ln(1.0+least(like_count,1000)+2.0*least(reply_count,20))
) STORED;
CREATE INDEX IF NOT EXISTS forum_posts_rank_idx ON forum_posts(feed_score DESC,created_at DESC,id DESC) WHERE status='published';
CREATE TABLE IF NOT EXISTS forum_likes (
  post_id uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  visitor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(post_id,visitor_id)
);
CREATE TABLE IF NOT EXISTS forum_like_limits (
  key text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS forum_feed_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_ids uuid[] NOT NULL CHECK(cardinality(post_ids)<=500),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS forum_feed_snapshot_cleanup_idx ON forum_feed_snapshots(created_at);
CREATE OR REPLACE FUNCTION forum_reply_counter() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP<>'INSERT' THEN
    IF NOT OLD.hidden THEN UPDATE forum_posts SET reply_count=greatest(0,reply_count-1) WHERE id=OLD.post_id; END IF;
  END IF;
  IF TG_OP<>'DELETE' THEN
    IF NOT NEW.hidden THEN UPDATE forum_posts SET reply_count=reply_count+1 WHERE id=NEW.post_id; END IF;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS forum_reply_counter_trigger ON forum_replies;
CREATE TRIGGER forum_reply_counter_trigger AFTER INSERT OR DELETE OR UPDATE OF hidden,post_id ON forum_replies FOR EACH ROW EXECUTE FUNCTION forum_reply_counter();
CREATE OR REPLACE FUNCTION forum_like_counter() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' THEN UPDATE forum_posts SET like_count=like_count+1 WHERE id=NEW.post_id;
  ELSE UPDATE forum_posts SET like_count=greatest(0,like_count-1) WHERE id=OLD.post_id;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS forum_like_counter_trigger ON forum_likes;
CREATE TRIGGER forum_like_counter_trigger AFTER INSERT OR DELETE ON forum_likes FOR EACH ROW EXECUTE FUNCTION forum_like_counter();

ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS forum_posts_slug_idx ON forum_posts(slug);
CREATE OR REPLACE FUNCTION forum_post_slug_default() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug='' THEN
    NEW.slug=coalesce(nullif(left(trim(both '-' FROM regexp_replace(lower(NEW.title),'[^[:alnum:]]+','-','g')),80),''),'post')||'-'||left(replace(NEW.id::text,'-',''),12);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS forum_post_slug_trigger ON forum_posts;
CREATE TRIGGER forum_post_slug_trigger BEFORE INSERT ON forum_posts FOR EACH ROW EXECUTE FUNCTION forum_post_slug_default();
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS discussion_updated_at timestamptz;
ALTER TABLE forum_replies ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES forum_replies(id) ON DELETE CASCADE;
ALTER TABLE forum_replies ADD COLUMN IF NOT EXISTS hidden_by_parent boolean NOT NULL DEFAULT false;
ALTER TABLE forum_replies ADD COLUMN IF NOT EXISTS child_count integer NOT NULL DEFAULT 0 CHECK(child_count>=0);
ALTER TABLE forum_replies ADD COLUMN IF NOT EXISTS depth smallint NOT NULL DEFAULT 0 CHECK(depth BETWEEN 0 AND 32);
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='forum_replies' AND column_name='root_id') THEN
    ALTER TABLE forum_replies ADD COLUMN root_id uuid;
    UPDATE forum_replies SET root_id=id;
    ALTER TABLE forum_replies ALTER COLUMN root_id SET NOT NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS forum_replies_children_idx ON forum_replies(post_id,parent_id,created_at DESC,id DESC);
CREATE OR REPLACE FUNCTION forum_reply_thread() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent forum_replies%ROWTYPE;
BEGIN
  IF NEW.parent_id IS NULL THEN NEW.root_id=NEW.id; NEW.depth=0;
  ELSE
    SELECT * INTO parent FROM forum_replies WHERE id=NEW.parent_id AND post_id=NEW.post_id;
    IF NOT FOUND OR parent.hidden OR parent.hidden_by_parent OR parent.depth>=32 THEN RAISE EXCEPTION 'Reply parent is unavailable'; END IF;
    NEW.root_id=parent.root_id; NEW.depth=parent.depth+1;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS forum_reply_thread_trigger ON forum_replies;
CREATE TRIGGER forum_reply_thread_trigger BEFORE INSERT ON forum_replies FOR EACH ROW EXECUTE FUNCTION forum_reply_thread();
CREATE OR REPLACE FUNCTION forum_reply_counter() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP<>'INSERT' THEN
    IF NOT OLD.hidden AND NOT OLD.hidden_by_parent THEN
      UPDATE forum_posts SET reply_count=greatest(0,reply_count-1),discussion_updated_at=clock_timestamp() WHERE id=OLD.post_id;
      IF OLD.parent_id IS NOT NULL THEN UPDATE forum_replies SET child_count=greatest(0,child_count-1) WHERE id=OLD.parent_id; END IF;
    END IF;
  END IF;
  IF TG_OP<>'DELETE' THEN
    IF NOT NEW.hidden AND NOT NEW.hidden_by_parent THEN
      UPDATE forum_posts SET reply_count=reply_count+1,discussion_updated_at=clock_timestamp() WHERE id=NEW.post_id;
      IF NEW.parent_id IS NOT NULL THEN UPDATE forum_replies SET child_count=child_count+1 WHERE id=NEW.parent_id; END IF;
    END IF;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS forum_reply_counter_trigger ON forum_replies;
CREATE TRIGGER forum_reply_counter_trigger AFTER INSERT OR DELETE OR UPDATE OF hidden,hidden_by_parent,post_id ON forum_replies FOR EACH ROW EXECUTE FUNCTION forum_reply_counter();

-- Shop: money is stored in minor units; order items preserve purchase-time details.
CREATE TABLE IF NOT EXISTS shop_products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 sitemap_id bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 slug text NOT NULL UNIQUE, name text NOT NULL, description text NOT NULL,
 category text NOT NULL DEFAULT 'Collection', price integer NOT NULL CHECK(price>0),
 stock integer NOT NULL DEFAULT 0 CHECK(stock>=0),
 images uuid[] NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 seo_title text NOT NULL DEFAULT '', seo_description text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_products_public_idx ON shop_products(created_at DESC) WHERE status='published';
INSERT INTO settings(key,value) VALUES('shop','{"currency":"LKR","shipping":0,"payment":"manual","delivery":"We will contact you to confirm delivery.","returns":"Contact us before returning an item."}') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS shop_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 submission_id uuid NOT NULL UNIQUE, name text NOT NULL, email text NOT NULL, phone text NOT NULL,
 address text NOT NULL, city text NOT NULL, postal_code text NOT NULL, country text NOT NULL,
 notes text NOT NULL DEFAULT '', items jsonb NOT NULL, subtotal integer NOT NULL CHECK(subtotal>=0),
 shipping integer NOT NULL CHECK(shipping>=0), currency text NOT NULL,
 payment_method text NOT NULL, payment_status text NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','paid','refunded')),
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','confirmed','shipped','completed','cancelled')),
 admin_note text NOT NULL DEFAULT '', tracking text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_orders_status_idx ON shop_orders(status,created_at DESC);
CREATE TABLE IF NOT EXISTS shop_order_limits(key text PRIMARY KEY, attempts integer NOT NULL DEFAULT 1, window_start timestamptz NOT NULL DEFAULT now());

-- Stable ordering supports small, indexed order-management pages.
CREATE INDEX IF NOT EXISTS shop_orders_created_id_idx ON shop_orders(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS shop_orders_payment_idx ON shop_orders(payment_status,created_at DESC,id DESC);

-- Payment choices are opt-in. This migration never rewrites saved order methods.
UPDATE settings SET value=(value || '{"cod_enabled":false,"payment":"manual","payment_instructions":""}'::jsonb),updated_at=now() WHERE key='shop' AND NOT(value ? 'cod_enabled');
ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS customer_access_hash text;
CREATE TABLE IF NOT EXISTS shop_payment_proofs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
 upload_id uuid NOT NULL UNIQUE,
 filename text NOT NULL CHECK(length(filename)<=160),
 mime text NOT NULL CHECK(mime IN ('application/pdf','image/webp')),
 data bytea NOT NULL CHECK(octet_length(data)>0 AND octet_length(data)<=5242880),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 review_note text NOT NULL DEFAULT '' CHECK(length(review_note)<=500),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS shop_payment_proofs_order_idx ON shop_payment_proofs(order_id,created_at DESC);
CREATE INDEX IF NOT EXISTS shop_payment_proofs_pending_idx ON shop_payment_proofs(order_id) WHERE status='pending';
CREATE TABLE IF NOT EXISTS shop_proof_limits(key text PRIMARY KEY,attempts integer NOT NULL DEFAULT 1,window_start timestamptz NOT NULL DEFAULT now());
ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS customer_access_expires_at timestamptz;
UPDATE shop_orders SET customer_access_expires_at=created_at+interval '30 days' WHERE customer_access_hash IS NOT NULL AND customer_access_expires_at IS NULL;
