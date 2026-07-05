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

// List assessments
async function listAssessments(supabaseClient: any, params: URLSearchParams) {
  let query = supabaseClient
    .from("assessments")
    .select(`
      *,
      assessment_type:assessment_types(id, nama, kategori)
    `)
    .order("tanggal", { ascending: false });
  
  // Filter by term (validate UUID)
  const termId = params.get("term_id");
  if (termId && !isValidUUID(termId)) {
    throw new Error("Invalid term_id format");
  }
  if (termId) query = query.eq("academic_term_id", termId);
  
  // Filter by type (validate UUID)
  const typeId = params.get("type_id");
  if (typeId && !isValidUUID(typeId)) {
    throw new Error("Invalid type_id format");
  }
  if (typeId) query = query.eq("assessment_type_id", typeId);
  
  // Filter by stage
  const stage = params.get("stage");
  if (stage && !['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(stage)) {
    throw new Error("stage must be DRAFT, PUBLISHED, or ARCHIVED");
  }
  if (stage) query = query.eq("stage", stage);
  
  // Filter by date range
  const tanggalMulai = params.get("tanggal_mulai");
  const tanggalSelesai = params.get("tanggal_selesai");
  if (tanggalMulai) query = query.gte("tanggal", tanggalMulai);
  if (tanggalSelesai) query = query.lte("tanggal", tanggalSelesai);
  
  const { data, error } = await query.limit(100);
  if (error) throw error;
  return data;
}

// Get single assessment
async function getAssessment(supabaseClient: any, id: string) {
  if (!isValidUUID(id)) {
    throw new Error("Invalid assessment ID format");
  }
  
  const { data, error } = await supabaseClient
    .from("assessments")
    .select(`
      *,
      assessment_type:assessment_types(id, nama, kategori),
      created_by_guru:gurus!created_by(id, nama)
    `)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

// Create assessment
async function createAssessment(supabaseClient: any, body: any, userId: string) {
  if (!body.assessment_type_id || !body.pembagian_mengajar_id || !body.academic_term_id || !body.judul || !body.tanggal || body.bobot === undefined) {
    throw new Error("assessment_type_id, pembagian_mengajar_id, academic_term_id, judul, tanggal, and bobot are required");
  }
  
  // Validate UUIDs
  if (!isValidUUID(body.assessment_type_id)) {
    throw new Error("Invalid assessment_type_id format");
  }
  if (!isValidUUID(body.pembagian_mengajar_id)) {
    throw new Error("Invalid pembagian_mengajar_id format");
  }
  if (!isValidUUID(body.academic_term_id)) {
    throw new Error("Invalid academic_term_id format");
  }
  
  const bobotVal = parseFloat(body.bobot);
  if (isNaN(bobotVal) || bobotVal < 0 || bobotVal > 100) {
    throw new Error("bobot must be a number between 0 and 100");
  }
  
  const tanggalVal = new Date(body.tanggal);
  if (isNaN(tanggalVal.getTime())) {
    throw new Error("Invalid date format for tanggal (use YYYY-MM-DD)");
  }
  
  // Validate judul length
  if (body.judul && body.judul.length > 200) {
    throw new Error("judul must be at most 200 characters");
  }

  const { data, error } = await supabaseClient
    .from("assessments")
    .insert([{
      assessment_type_id: body.assessment_type_id,
      pembagian_mengajar_id: body.pembagian_mengajar_id,
      academic_term_id: body.academic_term_id,
      judul: body.judul,
      deskripsi: body.deskripsi,
      tanggal: body.tanggal,
      bobot: bobotVal,
      stage: "DRAFT",
      created_by: userId
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Update assessment
async function updateAssessment(supabaseClient: any, id: string, body: any) {
  if (!isValidUUID(id)) {
    throw new Error("Invalid assessment ID format");
  }
  
  if (body.bobot !== undefined) {
    const bobotVal = parseFloat(body.bobot);
    if (isNaN(bobotVal) || bobotVal < 0 || bobotVal > 100) {
      throw new Error("bobot must be a number between 0 and 100");
    }
  }
  
  if (body.tanggal !== undefined) {
    const tanggalVal = new Date(body.tanggal);
    if (isNaN(tanggalVal.getTime())) {
      throw new Error("Invalid date format for tanggal");
    }
  }
  
  if (body.stage !== undefined && body.stage !== "DRAFT" && body.stage !== "PUBLISHED" && body.stage !== "ARCHIVED") {
    throw new Error("stage must be either DRAFT, PUBLISHED, or ARCHIVED");
  }
  
  // Build update object
  const updateData: any = {};
  const fields = ['judul', 'deskripsi', 'tanggal', 'bobot', 'stage'];
  fields.forEach(field => {
    if (body[field] !== undefined) {
      updateData[field] = field === 'bobot' ? parseFloat(body[field]) : body[field];
    }
  });

  const { data, error } = await supabaseClient
    .from("assessments")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Publish assessment
async function publishAssessment(supabaseClient: any, id: string) {
  if (!isValidUUID(id)) {
    throw new Error("Invalid assessment ID format");
  }
  
  const { data, error } = await supabaseClient
    .from("assessments")
    .update({ stage: "PUBLISHED" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Archive assessment
async function archiveAssessment(supabaseClient: any, id: string) {
  if (!isValidUUID(id)) {
    throw new Error("Invalid assessment ID format");
  }
  
  const { data, error } = await supabaseClient
    .from("assessments")
    .update({ stage: "ARCHIVED" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Get assessment details
async function getAssessmentDetails(supabaseClient: any, assessmentId: string) {
  if (!isValidUUID(assessmentId)) {
    throw new Error("Invalid assessment ID format");
  }
  
  const { data, error } = await supabaseClient
    .from("assessment_details")
    .select(`
      *,
      siswa:siswas(id, nisn, nipd, nama, jk)
    `)
    .eq("assessment_id", assessmentId);
  if (error) throw error;
  
  if (data) {
    data.sort((a: any, b: any) => (a.siswa?.nama || '').localeCompare(b.siswa?.nama || '', undefined, { numeric: true }));
  }
  return data;
}

// Input/update nilai siswa
async function inputNilai(supabaseClient: any, body: any) {
  if (!body.assessment_id || !body.siswa_id || body.nilai === undefined) {
    throw new Error("assessment_id, siswa_id, and nilai are required");
  }
  
  // Validate UUIDs
  if (!isValidUUID(body.assessment_id)) {
    throw new Error("Invalid assessment_id format");
  }
  if (!isValidUUID(body.siswa_id)) {
    throw new Error("Invalid siswa_id format");
  }
  
  // Validate nilai
  const nilaiVal = parseFloat(body.nilai);
  if (isNaN(nilaiVal) || nilaiVal < 0 || nilaiVal > 100) {
    throw new Error("nilai must be a number between 0 and 100");
  }

  const { data, error } = await supabaseClient
    .from("assessment_details")
    .upsert([{
      assessment_id: body.assessment_id,
      siswa_id: body.siswa_id,
      nilai: nilaiVal,
      catatan: body.catatan
    }], { onConflict: "assessment_id,siswa_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Get assessment types
async function getAssessmentTypes(supabaseClient: any) {
  const { data, error } = await supabaseClient
    .from("assessment_types")
    .select("*")
    .order("kategori", { ascending: true })
    .order("nama", { ascending: true });
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
    let result;
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

    // Routes
    if (pathParts.length === 2 && pathParts[0] === "assessment-api" && pathParts[1] === "types" && method === "GET") {
      result = await getAssessmentTypes(supabaseClient);
    }
    else if (pathParts.length === 1 && pathParts[0] === "assessment-api" && method === "GET") {
      result = await listAssessments(supabaseClient, url.searchParams);
    }
    else if (pathParts.length === 1 && pathParts[0] === "assessment-api" && method === "POST") {
      const body = await req.json();
      result = await createAssessment(supabaseClient, body, user.id);
    }
    else if (pathParts.length === 2 && pathParts[0] === "assessment-api") {
      const id = pathParts[1];
      if (method === "GET") {
        result = await getAssessment(supabaseClient, id);
      } else if (method === "PUT") {
        const body = await req.json();
        result = await updateAssessment(supabaseClient, id, body);
      } else {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
        });
      }
    }
    else if (pathParts.length === 3 && pathParts[0] === "assessment-api" && pathParts[2] === "publish" && method === "POST") {
      result = await publishAssessment(supabaseClient, pathParts[1]);
    }
    else if (pathParts.length === 3 && pathParts[0] === "assessment-api" && pathParts[2] === "archive" && method === "POST") {
      result = await archiveAssessment(supabaseClient, pathParts[1]);
    }
    else if (pathParts.length === 3 && pathParts[0] === "assessment-api" && pathParts[2] === "details" && method === "GET") {
      result = await getAssessmentDetails(supabaseClient, pathParts[1]);
    }
    else if (pathParts.length === 2 && pathParts[0] === "assessment-api" && pathParts[1] === "details" && method === "POST") {
      const body = await req.json();
      result = await inputNilai(supabaseClient, body);
    }
    else {
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
