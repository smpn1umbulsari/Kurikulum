import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Creates a Supabase client configured with the user's JWT token
 * and the anon key to enforce Row Level Security (RLS) policies.
 */
export function createSupabaseClient(req: Request) {
  const authHeader = req.headers.get("Authorization");
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: {
          Authorization: authHeader || "",
        },
      },
      auth: { persistSession: false },
    },
  );
}

/**
 * Creates a Supabase client using the service role key.
 * WARNING: This client bypasses RLS policies. Only use for admin/system actions.
 */
export function createAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
}
