-- ============================================================
-- Supabase pgvector setup for RAG pipeline
-- Run this ONCE in the Supabase SQL Editor
-- ============================================================

-- Enable pgvector extension
create extension if not exists vector;

-- Create table for storing document chunks
create table if not exists document_chunks (
  id bigserial primary key,
  content text not null,
  embedding vector(1536),
  subject text,
  level text,
  year integer,
  type text,
  filename text,
  created_at timestamp with time zone default now()
);

-- Create index for fast similarity search
create index if not exists document_chunks_embedding_idx 
on document_chunks 
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Create function for similarity search
create or replace function match_documents(
  query_embedding vector(1536),
  match_count int,
  filter_subject text default null,
  filter_level text default null
)
returns table (
  id bigint,
  content text,
  subject text,
  level text,
  year integer,
  type text,
  filename text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    document_chunks.id,
    document_chunks.content,
    document_chunks.subject,
    document_chunks.level,
    document_chunks.year,
    document_chunks.type,
    document_chunks.filename,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where 
    (filter_subject is null or document_chunks.subject = filter_subject)
    and
    (filter_level is null or document_chunks.level = filter_level)
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;
