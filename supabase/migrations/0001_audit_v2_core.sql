-- 1. Update Scan Status Enum
-- We need to drop the old constraint and add the new one
ALTER TABLE public.scans DROP CONSTRAINT IF EXISTS scans_status_check;
ALTER TABLE public.scans ADD CONSTRAINT scans_status_check CHECK (status IN ('queued','crawling','analyzing','ai_processing','complete','failed','completed_with_errors'));

-- 2. Add Missing Columns to Issues (Audit v2)
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS subcategory text;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS confidence float DEFAULT 1.0;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS detection_type text DEFAULT 'deterministic';
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS scope text DEFAULT 'page';
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS page_role text;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS affected_pages_count integer DEFAULT 1;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS evidence text;

-- 3. Add Category Status to Scan Scores
ALTER TABLE public.scan_scores ADD COLUMN IF NOT EXISTS seo_status text DEFAULT 'ok';
ALTER TABLE public.scan_scores ADD COLUMN IF NOT EXISTS accessibility_status text DEFAULT 'ok';
ALTER TABLE public.scan_scores ADD COLUMN IF NOT EXISTS performance_status text DEFAULT 'ok';
ALTER TABLE public.scan_scores ADD COLUMN IF NOT EXISTS security_status text DEFAULT 'ok';
ALTER TABLE public.scan_scores ADD COLUMN IF NOT EXISTS ux_status text DEFAULT 'ok';
ALTER TABLE public.scan_scores ADD COLUMN IF NOT EXISTS broken_links_status text DEFAULT 'ok';

-- 4. Allow nulls for scores (they might already be nullable but let's be explicit)
ALTER TABLE public.scan_scores ALTER COLUMN seo DROP NOT NULL;
ALTER TABLE public.scan_scores ALTER COLUMN accessibility DROP NOT NULL;
ALTER TABLE public.scan_scores ALTER COLUMN performance DROP NOT NULL;
ALTER TABLE public.scan_scores ALTER COLUMN security DROP NOT NULL;
ALTER TABLE public.scan_scores ALTER COLUMN ux DROP NOT NULL;
ALTER TABLE public.scan_scores ALTER COLUMN broken_links DROP NOT NULL;
ALTER TABLE public.scan_scores ALTER COLUMN overall DROP NOT NULL;
