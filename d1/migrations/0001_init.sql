-- Leenk dashboard CMS schema (ADR-0002).
-- One Content Document (homepage) with immutable Content Revisions and
-- ordered Content Blocks in the fixed `full` and `tldr` variants.

CREATE TABLE IF NOT EXISTS content_documents (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  published_revision_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_revisions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES content_documents(id),
  number INTEGER NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('draft', 'published', 'archived')),
  title TEXT NOT NULL,
  seo_title TEXT NOT NULL,
  seo_description TEXT NOT NULL,
  seo_keywords TEXT NOT NULL,
  social_copy TEXT NOT NULL,
  profile_metadata TEXT NOT NULL DEFAULT '{}',
  payload_hash TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TEXT NOT NULL,
  archived_at TEXT,
  UNIQUE (document_id, number)
);

CREATE INDEX IF NOT EXISTS idx_content_revisions_document
  ON content_revisions (document_id, number DESC);

CREATE TABLE IF NOT EXISTS content_blocks (
  id TEXT PRIMARY KEY,
  revision_id TEXT NOT NULL REFERENCES content_revisions(id) ON DELETE CASCADE,
  variant TEXT NOT NULL CHECK (variant IN ('full', 'tldr')),
  position INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (
    kind IN ('intro', 'section', 'paragraph', 'bullet_list', 'contact')
  ),
  body TEXT NOT NULL,
  UNIQUE (revision_id, variant, position)
);

CREATE TABLE IF NOT EXISTS activity_entries (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  actor TEXT NOT NULL,
  summary TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_entries_created_at
  ON activity_entries (created_at DESC);
