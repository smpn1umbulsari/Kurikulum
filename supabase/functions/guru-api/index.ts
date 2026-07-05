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

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests per minute
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

// GET - List all gurus
async function listGurus(supabaseClient: any) {
  const { data, error } = await supabaseClient
    .from("gurus")
    .select("*")
    .is("deleted_at", null)
    .order("nama", { ascending: true });
  
  if (error) throw error;
  return data;
}

// GET by ID - Get single guru
async function getGuru(supabaseClient: any, id: string) {
  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new Error("Invalid guru ID format");
  }
  
  const { data, error } = await supabaseClient
    .from("gurus")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  
  if (error) throw error;
  return data;
}

// POST - Create new guru
async function createGuru(supabaseClient: any, body: any) {
  // Enhanced validation
  if (!body.id || !body.nip || !body.nama || !body.jk) {
    throw new Error("id, nip, nama, and jk are required");
  }
  
  // NIP validation (18 digits for real NIP, but allow flexible for testing)
  if (!/^\d{8,30}$/.test(body.nip)) {
    throw new Error("nip must be numeric and between 8 to 30 digits");
  }
  
  // JK validation
  if (body.jk !== 'L' && body.jk !== 'P') {
    throw new Error("jk must be L or P");
  }
  
  // Status validation
  if (body.status_aktif !== undefined && typeof body.status_aktif !== 'boolean') {
    throw new Error("status_aktif must be boolean");
  }
  
  // Email validation (optional)
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    throw new Error("Invalid email format");
  }
  
  // Phone validation (optional, Indonesian format)
  if (body.no_hp && !/^(\+62|62|0)[0-9]{9,12}$/.test(body.no_hp.replace(/\s/g, ''))) {
    throw new Error("Invalid no_hp format (Indonesian format: +62 or 08xx)");
  }
  
  // Date validation (optional)
  if (body.tanggal_lahir) {
    const d = new Date(body.tanggal_lahir);
    if (isNaN(d.getTime())) {
      throw new Error("Invalid date format for tanggal_lahir (use YYYY-MM-DD)");
    }
    if (d > new Date()) {
      throw new Error("tanggal_lahir cannot be in the future");
    }
  }
  
  // String length validation
  if (body.nama && body.nama.length > 100) {
    throw new Error("nama must be at most 100 characters");
  }
  if (body.email && body.email.length > 100) {
    throw new Error("email must be at most 100 characters");
  }

  const { data, error } = await supabaseClient
    .from("gurus")
    .insert([{
      id: body.id,
      nip: body.nip,
      nama: body.nama,
      gelar_depan: body.gelar_depan,
      gelar_belakang: body.gelar_belakang,
      jk: body.jk,
      tempat_lahir: body.tempat_lahir,
      tanggal_lahir: body.tanggal_lahir,
      no_hp: body.no_hp,
      email: body.email,
      status_aktif: body.status_aktif ?? true
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// PUT - Update guru
async function updateGuru(supabaseClient: any, id: string, body: any) {
  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new Error("Invalid guru ID format");
  }
  
  // NIP validation
  if (body.nip !== undefined && !/^\d{8,30}$/.test(body.nip)) {
    throw new Error("nip must be numeric and between 8 to 30 digits");
  }
  
  // JK validation
  if (body.jk !== undefined && body.jk !== 'L' && body.jk !== 'P') {
    throw new Error("jk must be L or P");
  }
  
  // Email validation
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    throw new Error("Invalid email format");
  }
  
  // Phone validation
  if (body.no_hp && !/^(\+62|62|0)[0-9]{9,12}$/.test(body.no_hp.replace(/\s/g, ''))) {
    throw new Error("Invalid no_hp format");
  }
  
  // Date validation
  if (body.tanggal_lahir !== undefined && body.tanggal_lahir !== null) {
    const d = new Date(body.tanggal_lahir);
    if (isNaN(d.getTime())) {
      throw new Error("Invalid date format for tanggal_lahir");
    }
  }
  
  // Build update object (only include provided fields)
  const updateData: any = {};
  const fields = ['nip', 'nama', 'gelar_depan', 'gelar_belakang', 'jk', 'tempat_lahir', 'tanggal_lahir', 'no_hp', 'email', 'status_aktif'];
  fields.forEach(field => {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  });

  const { data, error } = await supabaseClient
    .from("gurus")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// DELETE - Soft delete guru
async function deleteGuru(supabaseClient: any, id: string, authUid: string) {
  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new Error("Invalid guru ID format");
  }
  
  const { data, error } = await supabaseClient
    .from("gurus")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: authUid
    })
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// SEARCH - Search gurus
async function searchGurus(supabaseClient: any, query: string) {
  // Sanitize search query
  const sanitizedQuery = query.replace(/[%_]/g, '').slice(0, 100);
  
  const { data, error } = await supabaseClient
    .from("gurus")
    .select("*")
    .is("deleted_at", null)
    .or(`nama.ilike.%${sanitizedQuery}%,nip.ilike.%${sanitizedQuery}%`)
    .order("nama", { ascending: true })
    .limit(100); // Limit search results
  
  if (error) throw error;
  return data;
}

serve(async (req: Request) => {
  // Handle CORS preflight
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

    // Parse URL
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

    // Route: /guru-api
    if (pathParts.length === 1 && pathParts[0] === "guru-api") {
      if (method === "GET") {
        const query = url.searchParams.get("q");
        if (query) {
          result = await searchGurus(supabaseClient, query);
        } else {
          result = await listGurus(supabaseClient);
        }
      } else if (method === "POST") {
        const body = await req.json();
        result = await createGuru(supabaseClient, body);
      } else {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
        });
      }
    }
    // Route: /guru-api/:id
    else if (pathParts.length === 2 && pathParts[0] === "guru-api") {
      const id = pathParts[1];
      if (method === "GET") {
        result = await getGuru(supabaseClient, id);
      } else if (method === "PUT") {
        const body = await req.json();
        result = await updateGuru(supabaseClient, id, body);
      } else if (method === "DELETE") {
        result = await deleteGuru(supabaseClient, id, user.id);
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
