/**
 * SIKAD v4.0 - Edge Function: bulk-register-guru
 * 
 * Purpose:
 * 1. Bulk auto-create Supabase Auth accounts for ALL existing gurus
 * 2. Generate email based on NIP or nama
 * 3. Set default password that must be changed on first login
 * 
 * Usage:
 * POST /functions/v1/bulk-register-guru
 * Headers: Authorization: Bearer <service_role_key>
 * Body: { dry_run?: true } - Optional dry run mode
 * 
 * Response:
 * {
 *   success: true,
 *   total_gurus: number,
 *   created: number,
 *   skipped: number,
 *   failed: number,
 *   details: [{ guru_id, email, status, error? }]
 * }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_PASSWORD = "GantiPassword123!";

function generateEmail(nip: string | null, nama: string): string {
  if (nip && nip.trim() !== "") {
    return `${nip}@spenturi.sch.id`;
  }
  // Remove non-alphanumeric, lowercase, remove spaces
  const cleanName = nama
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .substring(0, 30);
  return `${cleanName}@spenturi.sch.id`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse request body
    const { dry_run } = await req.json().catch(() => ({ dry_run: false }));
    const isDryRun = dry_run === true;

    // Fetch all gurus without auth_user_id
    const { data: gurus, error: fetchError } = await supabaseAdmin
      .from("gurus")
      .select("id, nama, nip, auth_user_id, email")
      .is("auth_user_id", null)
      .eq("status_aktif", true);

    if (fetchError) {
      return new Response(
        JSON.stringify({ 
          error: "FETCH_ERROR", 
          message: fetchError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = {
      success: true,
      dry_run: isDryRun,
      total_gurus: gurus?.length || 0,
      created: 0,
      skipped: 0,
      failed: 0,
      details: [] as Array<{
        guru_id: string;
        nama: string;
        email: string;
        status: string;
        error?: string;
      }>
    };

    if (!gurus || gurus.length === 0) {
      return new Response(
        JSON.stringify(results),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process each guru
    for (const guru of gurus) {
      const email = generateEmail(guru.nip, guru.nama);
      const detail = {
        guru_id: guru.id,
        nama: guru.nama,
        email,
        status: "pending" as string,
        error: undefined as string | undefined,
      };

      try {
        // Check if email already exists
        const { data: existingUser } = await supabaseAdmin.auth.admin.findUserByEmail(email);
        
        if (existingUser) {
          detail.status = "skipped";
          detail.error = "Email already exists";
          results.skipped++;
        } else if (isDryRun) {
          detail.status = "would_create";
          results.skipped++; // In dry run, count as skipped
        } else {
          // Create auth user
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: DEFAULT_PASSWORD,
            email_confirm: true,
            user_metadata: {
              nama: guru.nama,
              guru_id: guru.id,
              role: "GURU",
            },
          });

          if (authError) {
            detail.status = "failed";
            detail.error = authError.message;
            results.failed++;
          } else {
            // Link guru to auth user
            const { error: linkError } = await supabaseAdmin.rpc("link_guru_to_auth", {
              p_guru_id: guru.id,
              p_auth_user_id: authUser.user.id,
            });

            if (linkError) {
              detail.status = "failed";
              detail.error = `Auth created but link failed: ${linkError.message}`;
              results.failed++;
            } else {
              detail.status = "created";
              results.created++;
            }
          }
        }
      } catch (err) {
        detail.status = "failed";
        detail.error = err instanceof Error ? err.message : "Unknown error";
        results.failed++;
      }

      results.details.push(detail);
    }

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return new Response(
      JSON.stringify({ 
        error: "INTERNAL_ERROR", 
        message: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
