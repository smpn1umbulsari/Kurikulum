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

// UUID validation helper
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUUID(id: string): boolean {
  return uuidRegex.test(id);
}

async function listKelas(supabaseClient: any, params: URLSearchParams) {
  let query = supabaseClient
    .from("kelas")
    .select("*")
    .order("nama_kelas", { ascending: true });
  
  // Filter by term (validate UUID)
  const termId = params.get("term_id");
  if (termId && !isValidUUID(termId)) {
    throw new Error("Invalid term_id format");
  }
  if (termId) {
    query = query.eq("academic_term_id", termId);
  }
  
  // Filter by tingkat
  const tingkat = params.get("tingkat");
  if (tingkat) {
    const tingkatNum = parseInt(tingkat);
    if (isNaN(tingkatNum) || ![10, 11, 12].includes(tingkatNum)) {
      throw new Error("tingkat must be 10, 11, or 12");
    }
    query = query.eq("tingkat", tingkatNum);
  }
  
  const { data, error } = await query.limit(100); // Limit results
  if (error) throw error;
  return data;
}

async function getKelas(supabaseClient: any, id: string) {
  if (!isValidUUID(id)) {
    throw new Error("Invalid kelas ID format");
  }
  
  const { data, error } = await supabaseClient
    .from("kelas")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

async function getKelasWithWali(supabaseClient: any, id: string) {
  if (!isValidUUID(id)) {
    throw new Error("Invalid kelas ID format");
  }
  
  const { data, error } = await supabaseClient
    .from("kelas")
    .select(`
      *,
      wali_kelas:gurus(id, nama, nip)
    `)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

async function createKelas(supabaseClient: any, body: any) {
  // Required fields validation
  if (!body.academic_term_id || !body.nama_kelas || !body.tingkat || !body.jenis) {
    throw new Error("academic_term_id, nama_kelas, tingkat, and jenis are required");
  }
  
  // Validate academic_term_id UUID
  if (!isValidUUID(body.academic_term_id)) {
    throw new Error("Invalid academic_term_id format");
  }
  
  // Validate tingkat
  const tingkatVal = parseInt(body.tingkat);
  if (isNaN(tingkatVal) || ![10, 11, 12].includes(tingkatVal)) {
    throw new Error("tingkat must be 10, 11, or 12");
  }
  
  // Validate jenis
  if (body.jenis !== "REGULER" && body.jenis !== "AKSELERASI") {
    throw new Error("jenis must be either REGULER or AKSELERASI");
  }
  
  // Validate kapasitas
  const kapasitasVal = body.kapasitas !== undefined ? parseInt(body.kapasitas) : 36;
  if (isNaN(kapasitasVal) || kapasitasVal <= 0 || kapasitasVal > 60) {
    throw new Error("kapasitas must be a positive integer between 1 and 60");
  }
  
  // Validate nama_kelas length
  if (body.nama_kelas && body.nama_kelas.length > 20) {
    throw new Error("nama_kelas must be at most 20 characters");
  }

  const { data, error } = await supabaseClient
    .from("kelas")
    .insert([{
      academic_term_id: body.academic_term_id,
      nama_kelas: body.nama_kelas,
      tingkat: tingkatVal,
      jenis: body.jenis,
      wali_kelas_id: body.wali_kelas_id,
      kapasitas: kapasitasVal
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateKelas(supabaseClient: any, id: string, body: any) {
  if (!isValidUUID(id)) {
    throw new Error("Invalid kelas ID format");
  }
  
  // Validate tingkat
  if (body.tingkat !== undefined) {
    const tingkatVal = parseInt(body.tingkat);
    if (isNaN(tingkatVal) || ![10, 11, 12].includes(tingkatVal)) {
      throw new Error("tingkat must be 10, 11, or 12");
    }
  }
  
  // Validate jenis
  if (body.jenis !== undefined && body.jenis !== "REGULER" && body.jenis !== "AKSELERASI") {
    throw new Error("jenis must be either REGULER or AKSELERASI");
  }
  
  // Validate kapasitas
  if (body.kapasitas !== undefined) {
    const kapasitasVal = parseInt(body.kapasitas);
    if (isNaN(kapasitasVal) || kapasitasVal <= 0 || kapasitasVal > 60) {
      throw new Error("kapasitas must be a positive integer between 1 and 60");
    }
  }
  
  // Build update object
  const updateData: any = {};
  const fields = ['nama_kelas', 'tingkat', 'jenis', 'wali_kelas_id', 'kapasitas', 'status_aktif'];
  fields.forEach(field => {
    if (body[field] !== undefined) {
      updateData[field] = field === 'tingkat' || field === 'kapasitas' ? parseInt(body[field]) : body[field];
    }
  });

  const { data, error } = await supabaseClient
    .from("kelas")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getSiswaInKelas(supabaseClient: any, kelasId: string, termId: string) {
  if (!isValidUUID(kelasId)) {
    throw new Error("Invalid kelas ID format");
  }
  if (!isValidUUID(termId)) {
    throw new Error("Invalid term_id format");
  }
  
  const { data, error } = await supabaseClient
    .from("riwayat_kelas")
    .select(`
      *,
      siswa:siswas(id, nisn, nipd, nama, jk)
    `)
    .eq("kelas_real_id", kelasId)
    .eq("academic_term_id", termId);
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

    // GET /kelas-api - List kelas (RLS-aware)
    if (pathParts.length === 1 && pathParts[0] === "kelas-api") {
      if (method === "GET") {
        result = await listKelas(supabaseClient, url.searchParams);
      } else if (method === "POST") {
        const body = await req.json();
        result = await createKelas(supabaseClient, body);
      } else {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
        });
      }
    }
    // GET /kelas-api/:id - Get single kelas
    else if (pathParts.length === 2 && pathParts[0] === "kelas-api") {
      const id = pathParts[1];
      if (method === "GET") {
        const withWali = url.searchParams.get("with_wali");
        if (withWali === "true") {
          result = await getKelasWithWali(supabaseClient, id);
        } else {
          result = await getKelas(supabaseClient, id);
        }
      } else if (method === "PUT") {
        const body = await req.json();
        result = await updateKelas(supabaseClient, id, body);
      } else {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
        });
      }
    }
    // GET /kelas-api/:id/siswa - Get siswa in kelas
    else if (pathParts.length === 3 && pathParts[0] === "kelas-api" && pathParts[2] === "siswa") {
      const kelasId = pathParts[1];
      const termId = url.searchParams.get("term_id");
      if (!termId) {
        return new Response(JSON.stringify({ error: "term_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
        });
      }
      result = await getSiswaInKelas(supabaseClient, kelasId, termId);
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
