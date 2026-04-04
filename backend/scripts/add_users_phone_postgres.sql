-- Run on production Postgres if login returns 503 after adding User.phone in models.py
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(32);
