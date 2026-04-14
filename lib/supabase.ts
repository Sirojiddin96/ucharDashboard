import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Server-side only — uses service role key (never exposed to browser)
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
);
