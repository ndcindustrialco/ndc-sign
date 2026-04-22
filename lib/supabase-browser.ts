import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Anon-key client for the browser. Only used with signed upload URLs, which
// carry their own short-lived auth — RLS never sees this key for uploads.
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey)

// Kept in sync with lib/supabase.ts (server). Safe to hard-code the default
// here since the bucket name is not a secret.
export const STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "documents"
