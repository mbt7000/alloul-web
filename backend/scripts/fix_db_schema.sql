-- ============================================================
-- ALLOUL&Q — Production DB Schema Fix
-- Run this on the production Postgres server to fix 503 login errors.
-- Safe to run multiple times (uses IF NOT EXISTS).
-- ============================================================

-- 1. phone column on users (was missing from baseline)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(32);

-- 2. work_id on company_members (migration 0003)
ALTER TABLE company_members ADD COLUMN IF NOT EXISTS work_id VARCHAR(24);
CREATE UNIQUE INDEX IF NOT EXISTS ix_company_members_work_id ON company_members (work_id);

-- 3. employee_no on users (migration 0004)
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_no VARCHAR(8);
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_employee_no ON users (employee_no);

-- Backfill employee_no for existing users that don't have one yet
DO $$
DECLARE
  rec RECORD;
  counter INT := 10001;
BEGIN
  FOR rec IN SELECT id FROM users WHERE employee_no IS NULL ORDER BY id LOOP
    UPDATE users SET employee_no = CAST(counter AS TEXT) WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- 4. telegram_chat_id on users (migration 0005)
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(32);
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_telegram_chat_id ON users (telegram_chat_id);

-- ============================================================
-- Stamp Alembic to head so future migrations work correctly.
-- Run AFTER this script:
--   alembic stamp head
-- OR run full migration:
--   alembic upgrade head
-- ============================================================
