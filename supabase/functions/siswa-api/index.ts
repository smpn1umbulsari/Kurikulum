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

// GET - List all siswas
async function listSiswas(supabaseClient: any, params: URLSearchParams) {
  let query = supabaseClient
    .from("siswas")
    .select("*")
    .is("deleted_at", null)
    .order("nama", { ascending: true });
  
  // Pagination
  const page = parseInt(params.get("page") || "1");
  const limit = Math.min(parseInt(params.get("limit") || "50"), 100); // Max 100
  const from = (page - 1) * limit;
  
  const { data, error, count } = await query.range(from, from + limit - 1);
  if (error) throw error;
  return { data, count, page, limit };
}

// GET by ID - Get single siswa
async function getSiswa(supabaseClient: any, id: string) {
  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new Error("Invalid siswa ID format");
  }
  
  const { data, error } = await supabaseClient
    .from("siswas")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  
  if (error) throw error;
  return data;
}

// POST - Create new siswa
async function createSiswa(supabaseClient: any, body: any) {
  // Required fields validation
  if (!body.nisn || !body.nama || !body.jk) {
    throw new Error("nisn, nama, and jk are required");
  }
  
  // NISN validation (10 digits)
  if (!/^\d{10}$/.test(body.nisn)) {
    throw new Error("nisn must be exactly 10 digits");
  }
  
  // JK validation
  if (body.jk !== 'L' && body.jk !== 'P') {
    throw new Error("jk must be L or P");
  }
  
  // Status validation
  if (body.status_aktif !== undefined && typeof body.status_aktif !== 'boolean') {
    throw new Error("status_aktif must be boolean");
  }
  
  // Date validation
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
  if (body.alamat && body.alamat.length > 255) {
    throw new Error("alamat must be at most 255 characters");
  }
  if (body.nama_ayah && body.nama_ayah.length > 100) {
    throw new Error("nama_ayah must be at most 100 characters");
  }
  if (body.nama_ibu && body.nama_ibu.length > 100) {
    throw new Error("nama_ibu must be at most 100 characters");
  }

  const { data, error } = await supabaseClient
    .from("siswas")
    .insert([{
      nisn: body.nisn,
      nipd: body.nipd,
      nama: body.nama,
      jk: body.jk,
      agama: body.agama,
      tempat_lahir: body.tempat_lahir,
      tanggal_lahir: body.tanggal_lahir,
      alamat: body.alamat,
      nama_ayah: body.nama_ayah,
      nama_ibu: body.nama_ibu,
      no_hp_ortu: body.no_hp_ortu,
      status_aktif: body.status_aktif ?? true
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// PUT - Update siswa
async function updateSiswa(supabaseClient: any, id: string, body: any) {
  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new Error("Invalid siswa ID format");
  }
  
  // NISN validation
  if (body.nisn !== undefined && !/^\d{10}$/.test(body.nisn)) {
    throw new Error("nisn must be exactly 10 digits");
  }
  
  // JK validation
  if (body.jk !== undefined && body.jk !== 'L' && body.jk !== 'P') {
    throw new Error("jk must be L or P");
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
  const fields = ['nisn', 'nipd', 'nama', 'jk', 'agama', 'tempat_lahir', 'tanggal_lahir', 'alamat', 'nama_ayah', 'nama_ibu', 'no_hp_ortu', 'status_aktif'];
  fields.forEach(field => {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  });

  const { data, error } = await supabaseClient
    .from("siswas")
    .update(updateData)
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

// DELETE - Soft delete siswa
async function deleteSiswa(supabaseClient: any, id: string, authUid: string) {
  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new Error("Invalid siswa ID format");
  }
  
  const { data, error } = await supabaseClient
    .from("siswas")
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

// SEARCH - Search siswas
async function searchSiswas(supabaseClient: any, query: string) {
  // Sanitize search query - prevent SQL injection
  const sanitizedQuery = query.replace(/[%_]/g, '').slice(0, 100);
  
  const { data, error } = await supabaseClient
    .from("siswas")
    .select("*")
    .is("deleted_at", null)
    .or(`nama.ilike.%${sanitizedQuery}%,nisn.ilike.%${sanitizedQuery}%,nipd.ilike.%${sanitizedQuery}%`)
    .order("nama", { ascending: true })
    .limit(100);
  
  if (error) throw error;
  return data;
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

    if (pathParts.length === 1 && pathParts[0] === "siswa-api") {
      if (method === "GET") {
        const query = url.searchParams.get("q");
        if (query) {
          result = await searchSiswas(supabaseClient, query);
        } else {
          result = await listSiswas(supabaseClient, url.searchParams);
        }
      } else if (method === "POST") {
        const body = await req.json();
        result = await createSiswa(supabaseClient, body);
      } else {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
        });
      }
    }
    else if (pathParts.length === 2 && pathParts[0] === "siswa-api") {
      const id = pathParts[1];
      if (method === "GET") {
        result = await getSiswa(supabaseClient, id);
      } else if (method === "PUT") {
        const body = await req.json();
        result = await updateSiswa(supabaseClient, id, body);
      } else if (method === "DELETE") {
        result = await deleteSiswa(supabaseClient, id, user.id);
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
