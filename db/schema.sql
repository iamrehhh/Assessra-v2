-- Assessra-v2 Supabase Schema
-- Run this in your Supabase SQL editor at: https://supabase.com/dashboard

-- Users table (populated automatically via NextAuth/Google login)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paper attempts — stores every submission made by a user
CREATE TABLE IF NOT EXISTS paper_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  paper_id TEXT NOT NULL,         -- e.g. '2025_on_31'
  question_number TEXT NOT NULL,  -- e.g. '3(c)'
  answer TEXT NOT NULL,
  score INTEGER,
  max_marks INTEGER,
  feedback TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_attempts_user ON paper_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_paper ON paper_attempts(paper_id);

-- Cumulative scores view (used for scorecards and leaderboard)
CREATE OR REPLACE VIEW user_scores AS
SELECT
  u.id as user_id,
  u.name,
  u.email,
  COALESCE(SUM(pa.score), 0) as total_score,
  COALESCE(SUM(pa.max_marks), 0) as total_possible,
  COUNT(pa.id) as total_attempts
FROM users u
LEFT JOIN paper_attempts pa ON u.id = pa.user_id
GROUP BY u.id, u.name, u.email
ORDER BY total_score DESC;
