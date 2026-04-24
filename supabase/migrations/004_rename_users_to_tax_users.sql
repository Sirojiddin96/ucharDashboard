-- Rename public.users → public.tax_users
-- This frees up the "users" name for the future platform-level admin accounts table.
-- The renamed table stores taxi app end-users (passengers & drivers via bot/app).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tax_users'
  ) THEN
    ALTER TABLE public.users RENAME TO tax_users;
  END IF;
END $$;
