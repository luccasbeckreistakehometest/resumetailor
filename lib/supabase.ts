import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when Supabase auth/DB is configured. When false, the app runs in
 *  local-only MVP mode (localStorage), so nothing breaks before setup. */
export const authEnabled = Boolean(url && anon);

export const supabase: SupabaseClient | null = authEnabled
  ? createClient(url as string, anon as string)
  : null;
