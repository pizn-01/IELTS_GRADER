-- Personalized Learning PDF editions (one per 5 graded exams)

CREATE TABLE IF NOT EXISTS personalized_learning_editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  edition_number INT NOT NULL CHECK (edition_number >= 1),
  exam_range_start INT NOT NULL CHECK (exam_range_start >= 1),
  exam_range_end INT NOT NULL CHECK (exam_range_end >= exam_range_start),
  submission_ids UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'preview'
    CHECK (status IN ('preview', 'pending_payment', 'generating', 'ready', 'failed')),
  stripe_session_id TEXT,
  pdf_storage_path TEXT,
  dossier_snapshot JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ,
  UNIQUE (user_id, edition_number)
);

CREATE INDEX IF NOT EXISTS idx_learning_editions_user
  ON personalized_learning_editions (user_id, edition_number DESC);

CREATE INDEX IF NOT EXISTS idx_learning_editions_stripe_session
  ON personalized_learning_editions (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- Private bucket — signed URLs for download after purchase
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'learning-materials',
  'learning-materials',
  false,
  20971520,
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;
