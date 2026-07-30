-- RIK chatbot RAG schema for Supabase
-- Run in Supabase SQL Editor.

create extension if not exists vector;

create table if not exists public.rag_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  title text not null,
  source_type text not null default 'markdown',
  uri text,
  version text,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rag_documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.rag_sources(id) on delete cascade,
  document_key text not null unique,
  title text not null,
  content_hash text not null,
  language text not null default 'ru',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- IMPORTANT:
-- The vector dimension below is 1536 by default.
-- Change it if the selected embedding model has another dimension.
create table if not exists public.rag_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.rag_documents(id) on delete cascade,
  source_id uuid not null references public.rag_sources(id) on delete cascade,
  chunk_index integer not null,
  chunk_key text not null unique,
  heading text,
  content text not null,
  token_estimate integer,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rag_ingest_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,
  status text not null default 'running',
  source_count integer not null default 0,
  document_count integer not null default 0,
  chunk_count integer not null default 0,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists rag_sources_status_idx
  on public.rag_sources(status);

create index if not exists rag_documents_source_id_idx
  on public.rag_documents(source_id);

create index if not exists rag_chunks_source_id_idx
  on public.rag_chunks(source_id);

create index if not exists rag_chunks_document_id_idx
  on public.rag_chunks(document_id);

create index if not exists rag_chunks_content_fts_idx
  on public.rag_chunks using gin(to_tsvector('russian', content));

-- Choose index type after embedding model/dimension is final.
-- HNSW is usually a good default on modern pgvector.
create index if not exists rag_chunks_embedding_hnsw_idx
  on public.rag_chunks
  using hnsw (embedding vector_cosine_ops);

create or replace function public.match_rag_chunks(
  query_embedding vector(1536),
  match_count integer default 8,
  similarity_threshold float default 0.25,
  namespace_filter text default null
)
returns table (
  chunk_id uuid,
  document_id uuid,
  source_id uuid,
  source_key text,
  source_title text,
  document_title text,
  heading text,
  content text,
  similarity float,
  metadata jsonb
)
language sql
stable
as $$
  select
    c.id as chunk_id,
    c.document_id,
    c.source_id,
    s.source_key,
    s.title as source_title,
    d.title as document_title,
    c.heading,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity,
    c.metadata
  from public.rag_chunks c
  join public.rag_documents d on d.id = c.document_id
  join public.rag_sources s on s.id = c.source_id
  where c.embedding is not null
    and s.status = 'active'
    and (namespace_filter is null or c.metadata->>'namespace' = namespace_filter)
    and 1 - (c.embedding <=> query_embedding) >= similarity_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rag_sources_updated_at on public.rag_sources;
create trigger rag_sources_updated_at
before update on public.rag_sources
for each row execute function public.set_updated_at();

drop trigger if exists rag_documents_updated_at on public.rag_documents;
create trigger rag_documents_updated_at
before update on public.rag_documents
for each row execute function public.set_updated_at();

drop trigger if exists rag_chunks_updated_at on public.rag_chunks;
create trigger rag_chunks_updated_at
before update on public.rag_chunks
for each row execute function public.set_updated_at();

