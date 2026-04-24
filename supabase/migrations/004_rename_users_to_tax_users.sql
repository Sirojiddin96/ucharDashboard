-- Rename public.users → public.tax_users
-- This frees up the "users" name for the future platform-level admin accounts table.
-- The renamed table stores taxi app end-users (passengers & drivers via bot/app).

ALTER TABLE public.users RENAME TO tax_users;
