CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  relationship TEXT,
  project_type TEXT,
  answers JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS submissions_created_at_idx ON submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS submissions_email_idx ON submissions (email);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  sort_order INT NOT NULL,
  kicker TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  description TEXT,
  placeholder TEXT,
  type TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  options JSONB NOT NULL DEFAULT '[]',
  show_rule JSONB,
  role TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS questions_sort_order_idx ON questions (sort_order);

-- Then run src/lib/seed-questions.sql in the Neon SQL editor to insert the 69 questions.
