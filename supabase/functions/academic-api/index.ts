import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient, createAdminClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Security headers
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

// Rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100;
const RATE_WINDOW = 60000;

function checkRateLimit(clientId: string): { allowed: boolean; resetIn: number } {
  const now = Date.now();
  const record = rateLimitMap.get(clientId);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + RATE_WINDOW });
    return { allowed: true, resetIn: 0 };
  }
  
  if (record.count >= RATE_LIMIT) {
    return { allowed: false, resetIn: Math.ceil((record.resetTime - now) / 1000) };
  }
  
  record.count++;
  return { allowed: true, resetIn: 0 };
}

function getClientId(req: Request): string {
  const authHeader = req.headers.get("Authorization");
  if (authHeader) return `auth_${authHeader.slice(-20)}`;
  return `ip_${req.headers.get("x-forwarded-for") || "unknown"}`;
}

// UUID validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUUID(id: string): boolean {
  return uuidRegex.test(id);
}

async function listTerms(supabaseClient: any) {
  const { data, error } = await supabaseClient
    .from("academic_terms")
    .select("*")
    .order("tahun_ajaran", { ascending: false });
  if (error) throw error;
  return data;
}

async function getActiveTerm(supabaseClient: any) {
  const { data, error } = await supabaseClient
    .from("academic_terms")
    .select("*")
    .eq("status", true)
    .single();
  if (error) throw error;
  return data;
}

async function getTerm(supabaseClient: any, id: string) {
  if (!isValidUUID(id)) {
    throw new Error("Invalid term ID format");
  }
  
  const { data, error } = await supabaseClient
    .from("academic_terms")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

async function createTerm(supabaseClient: any, body: any) {
  // Required fields validation
  if (!body.tahun_ajaran || !body.semester || !body.tanggal_mulai || !body.tanggal_selesai) {
    throw new Error("tahun_ajaran, semester, tanggal_mulai, and tanggal_selesai are required");
  }
  
  // Validate tahun_ajaran format
  if (!/^\d{4}\/\d{4}$/.test(body.tahun_ajaran)) {
    throw new Error("tahun_ajaran must be in format YYYY/YYYY (e.g., 2024/2025)");
  }
  
  // Validate semester
  if (body.semester !== "GANJIL" && body.semester !== "GENAP") {
    throw new Error("semester must be either GANJIL or GENAP");
  }
  
  // Validate dates
  const start = new Date(body.tanggal_mulai);
  const end = new Date(body.tanggal_selesai);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Invalid date format (use YYYY-MM-DD)");
  }
  
  if (end <= start) {
    throw new Error("tanggal_selesai must be after tanggal_mulai");
  }
  
  // Validate input_mode
  if (body.input_mode && !['SEMESTER', 'ULANGAN', 'PRAKTEK'].includes(body.input_mode)) {
    throw new Error("input_mode must be SEMESTER, ULANGAN, or PRAKTEK");
  }

  const { data, error } = await supabaseClient
    .from("academic_terms")
    .insert([{
      tahun_ajaran: body.tahun_ajaran,
      semester: body.semester,
      tanggal_mulai: body.tanggal_mulai,
      tanggal_selesai: body.tanggal_selesai,
      input_mode: body.input_mode ?? "SEMESTER"
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function setActive(supabaseClient: any, id: string) {
  if (!isValidUUID(id)) {
    throw new Error("Invalid term ID format");
  }
  
  // First, deactivate all terms
  await supabaseClient
    .from("academic_terms")
    .update({ status: false })
    .eq("status", true);
  
  // Then activate the selected term
  const { data, error } = await supabaseClient
    .from("academic_terms")
    .update({ status: true })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function finalizeTerm(supabaseClient: any, id: string) {
  if (!isValidUUID(id)) {
    throw new Error("Invalid term ID format");
  }
  
  const { data, error } = await supabaseClient
    .from("academic_terms")
    .update({ finalized: true })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Authentication helper (uses admin client)
async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Unauthorized: No authorization header");
  }
  const token = authHeader.replace("Bearer ", "");
  const supabaseClient = createAdminClient();
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  if (authError || !user) {
    throw new Error("Unauthorized: Invalid token");
  }
  return user;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders, ...securityHeaders } });
  }

  try {
    // Rate limiting
    const clientId = getClientId(req);
    const rateCheck = checkRateLimit(clientId);
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({ 
        error: "Rate limit exceeded",
        retryAfter: rateCheck.resetIn
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          ...securityHeaders,
          "Content-Type": "application/json",
          "Retry-After": rateCheck.resetIn.toString()
        },
      });
    }

    const supabaseClient = createSupabaseClient(req);

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const method = req.method;

    // Auth check for write operations
    let user: any = null;
    const isWriteOperation = method === "POST" || method === "PUT" || method === "DELETE";
    if (isWriteOperation) {
      try {
        user = await getAuthenticatedUser(req);
      } catch (authError: any) {
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 401,
          headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let result;

    // GET /academic-api - List all terms (RLS-aware)
    if (pathParts.length === 1 && pathParts[0] === "academic-api") {
      if (method === "GET") {
        const active = url.searchParams.get("active");
        if (active === "true") {
          result = await getActiveTerm(supabaseClient);
        } else {
          result = await listTerms(supabaseClient);
        }
      } else {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
        });
      }
    }
    // POST /academic-api - Create term
    else if (pathParts.length === 1 && pathParts[0] === "academic-api" && method === "POST") {
      const body = await req.json();
      result = await createTerm(supabaseClient, body);
    }
    // POST /academic-api/:id/activate
    else if (pathParts.length === 3 && pathParts[0] === "academic-api" && pathParts[2] === "activate" && method === "POST") {
      result = await setActive(supabaseClient, pathParts[1]);
    }
    // POST /academic-api/:id/finalize
    else if (pathParts.length === 3 && pathParts[0] === "academic-api" && pathParts[2] === "finalize" && method === "POST") {
      result = await finalizeTerm(supabaseClient, pathParts[1]);
    }
    // GET /academic-api/:id
    else if (pathParts.length === 2 && pathParts[0] === "academic-api") {
      if (method === "GET") {
        result = await getTerm(supabaseClient, pathParts[1]);
      } else {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
    });
  }
});
