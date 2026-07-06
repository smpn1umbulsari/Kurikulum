/**
 * SIKAD v4.0 - Edge Function: register-guru-web
 * 
 * Purpose:
 * 1. Admin create guru account one-by-one (fallback)
 * 2. Auto-generate email based on NIP or nama
 * 3. Set default password that must be changed on first login
 * 
 * Usage:
 * POST /functions/v1/register-guru-web
 * Headers: Authorization: Bearer <service_role_key>
 * Body: { guru_id: "uuid", email?: "optional@email.com", password?: "optional-password" }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default password - guru MUST change after first login
const DEFAULT_PASSWORD = "GantiPassword123!";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse request body
    const { guru_id, email, password, full_name } = await req.json();

    // Validate guru_id
    if (!guru_id) {
      return new Response(
        JSON.stringify({ error: "MISSING_GURU_ID", message: "guru_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch guru data
    const { data: guru, error: guruError } = await supabaseAdmin
      .from("gurus")
      .select("*")
      .eq("id", guru_id)
      .single();

    if (guruError || !guru) {
      return new Response(
        JSON.stringify({ error: "GURU_NOT_FOUND", message: "Guru dengan ID tersebut tidak ditemukan" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate email if not provided
    let finalEmail = email;
    if (!finalEmail) {
      if (guru.nip && guru.nip.trim() !== "") {
        finalEmail = `${guru.nip}@spenturi.sch.id`;
      } else {
        // Remove non-alphanumeric, lowercase, remove spaces
        const cleanName = guru.nama
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .substring(0, 30);
        finalEmail = `${cleanName}@spenturi.sch.id`;
      }
    }

    const finalPassword = password || DEFAULT_PASSWORD;
    const finalName = full_name || guru.nama;

    // Check if guru already has auth_user_id
    if (guru.auth_user_id) {
      return new Response(
        JSON.stringify({ 
          error: "ALREADY_LINKED", 
          message: "Guru sudah memiliki akun web",
          auth_user_id: guru.auth_user_id,
          email: finalEmail
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email already exists in auth.users
    const { data: existingUser } = await supabaseAdmin.auth.admin.findUserByEmail(finalEmail);
    if (existingUser) {
      return new Response(
        JSON.stringify({ 
          error: "EMAIL_ALREADY_EXISTS", 
          message: `Email ${finalEmail} sudah digunakan oleh akun lain`,
          existing_auth_user_id: existingUser.id
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create auth user with auto-confirm
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: finalEmail,
      password: finalPassword,
      email_confirm: true, // Auto-confirm untuk admin-created accounts
      user_metadata: {
        nama: finalName,
        guru_id: guru_id,
        role: "GURU",
      },
    });

    if (authError) {
      console.error("Auth create error:", authError);
      return new Response(
        JSON.stringify({ 
          error: "AUTH_CREATE_FAILED", 
          message: authError.message,
          details: authError
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Link guru to auth user
    const { error: linkError } = await supabaseAdmin.rpc("link_guru_to_auth", {
      p_guru_id: guru_id,
      p_auth_user_id: authUser.user.id,
    });

    if (linkError) {
      console.error("Link error:", linkError);
      // Auth user created but link failed - cleanup would be needed
      return new Response(
        JSON.stringify({ 
          error: "LINK_FAILED", 
          message: "Akun dibuat tapi gagal link ke guru",
          auth_user_id: authUser.user.id,
          link_error: linkError.message
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Akun guru berhasil dibuat",
        auth_user_id: authUser.user.id,
        guru_id: guru_id,
        email: finalEmail,
        password_changed: false,
        instructions: "Guru harus mengganti password setelah login pertama"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
