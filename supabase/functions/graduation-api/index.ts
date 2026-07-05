import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient, createAdminClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

// List all graduation jobs
async function listGraduationJobs(supabaseClient: any) {
  const { data, error } = await supabaseClient
    .from("graduation_jobs")
    .select(`
      *,
      term:academic_terms(id, tahun_ajaran, semester),
      creator:gurus!created_by(id, nama)
    `)
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  return data;
}

// Get single graduation job with details
async function getGraduationJob(supabaseClient: any, jobId: string) {
  // Get job info
  const { data: job, error: jobError } = await supabaseClient
    .from("graduation_jobs")
    .select(`
      *,
      term:academic_terms(id, tahun_ajaran, semester),
      creator:gurus!created_by(id, nama)
    `)
    .eq("id", jobId)
    .single();
  
  if (jobError) throw jobError;

  // Get details
  const { data: details, error: detailsError } = await supabaseClient
    .from("graduation_details")
    .select(`
      *,
      siswa:siswas(id, nisn, nipd, nama, jk)
    `)
    .eq("graduation_job_id", jobId)
    .order("created_at", { ascending: true });
  
  if (detailsError) throw detailsError;

  return { ...job, details };
}

// Preview graduation - calculate students who will graduate
async function previewGraduation(
  supabaseClient: any,
  academicTermId: string
) {
  // Validate UUID
  if (!isValidUUID(academicTermId)) {
    throw new Error("Invalid academic_term_id format");
  }

  // Get academic term info
  const { data: term, error: termError } = await supabaseClient
    .from("academic_terms")
    .select("*")
    .eq("id", academicTermId)
    .single();
  if (termError) throw termError;

  // Get students in tingkat 12 who will graduate
  const { data: kelasXII, error: kelasError } = await supabaseClient
    .from("kelas")
    .select("id, nama_kelas, tingkat")
    .eq("academic_term_id", academicTermId)
    .eq("tingkat", 12);
  if (kelasError) throw kelasError;

  const kelasXIIIds = (kelasXII || []).map((k: any) => k.id);

  // Get students who will graduate (tingkat 12, aktif)
  let previewData: any[] = [];
  if (kelasXIIIds.length > 0) {
    const { data: riwayatList, error: riwayatError } = await supabaseClient
      .from("riwayat_kelas")
      .select(`
        *,
        siswa:siswas(id, nisn, nipd, nama, jk, status),
        kelas:kelas(id, nama_kelas)
      `)
      .in("kelas_real_id", kelasXIIIds)
      .eq("academic_term_id", academicTermId)
      .is("tanggal_selesai", null);
    if (riwayatError) throw riwayatError;

    previewData = (riwayatList || [])
      .filter((r: any) => r.siswa?.status === "AKTIF")
      .map((r: any) => ({
        siswa: r.siswa,
        kelas: r.kelas,
        status_graduation: "READY",
      }));
  }

  // Summary
  const summary = {
    total_kelas_12: kelasXIIIds.length,
    total_candidates: previewData.length,
    ready_to_graduate: previewData.filter((p: any) => p.status_graduation === "READY").length,
  };

  return {
    academic_term: term,
    summary,
    students: previewData,
  };
}

// Execute graduation - create job and process students
async function executeGraduation(
  supabaseClient: any,
  academicTermId: string,
  tahunLulus: number,
  userId: string
) {
  // Validate UUID
  if (!isValidUUID(academicTermId)) {
    throw new Error("Invalid academic_term_id format");
  }

  // Get preview data first
  const preview = await previewGraduation(supabaseClient, academicTermId);

  // Create graduation job
  const { data: job, error: jobError } = await supabaseClient
    .from("graduation_jobs")
    .insert({
      academic_term_id: academicTermId,
      status: "PENDING",
      total_siswa: preview.summary.ready_to_graduate,
      processed_siswa: 0,
      created_by: userId,
    })
    .select()
    .single();
  
  if (jobError) throw jobError;

  // Process each student graduation
  const processGraduations = async () => {
    const studentsToGraduate = preview.students.filter((s: any) => s.status_graduation === "READY");
    const processed: any[] = [];
    
    for (const student of studentsToGraduate) {
      try {
        // Call database function to execute graduation
        const { error: execError } = await supabaseClient
          .rpc("execute_siswa_graduation", {
            p_job_id: job.id,
            p_siswa_id: student.siswa.id,
            p_tahun_lulus: tahunLulus,
          });

        if (execError) {
          throw execError;
        }

        processed.push({ siswa_id: student.siswa.id, status: "SUCCESS" });
      } catch (err: any) {
        processed.push({ siswa_id: student.siswa.id, status: "FAILED", error: err.message });
      }

      // FIX: Update progress only every 10 students or at the end
      if (processed.length % 10 === 0 || processed.length === studentsToGraduate.length) {
        await supabaseClient
          .from("graduation_jobs")
          .update({ 
            processed_siswa: processed.length,
            status: "PROCESSING",
          })
          .eq("id", job.id);
      }
    }

    return processed;
  };

  // Execute graduations
  const results = await processGraduations();

  // Update job status
  const failedCount = results.filter((r: any) => r.status === "FAILED").length;
  const finalStatus = failedCount === 0 ? "COMPLETED" : (failedCount === results.length ? "FAILED" : "COMPLETED_WITH_ERRORS");

  await supabaseClient
    .from("graduation_jobs")
    .update({
      status: finalStatus,
      processed_siswa: results.length,
      finished_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  return {
    job_id: job.id,
    status: finalStatus,
    total: results.length,
    success: results.filter((r: any) => r.status === "SUCCESS").length,
    failed: failedCount,
    tahun_lulus: tahunLulus,
  };
}

// Get alumni list
async function getAlumniList(
  supabaseClient: any,
  params: URLSearchParams
) {
  const page = parseInt(params.get("page") || "1");
  const limit = Math.min(parseInt(params.get("limit") || "20"), 100);
  const tahunLulus = params.get("tahun_lulus");
  const offset = (page - 1) * limit;

  let query = supabaseClient
    .from("alumni")
    .select("id, nisn, nipd, nama, jk, agama, tahun_lulus, created_at", { count: "exact" })
    .order("tahun_lulus", { ascending: false })
    .order("nama", { ascending: true })
    .range(offset, offset + limit - 1);

  if (tahunLulus) {
    query = query.eq("tahun_lulus", parseInt(tahunLulus));
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    alumni: data,
    pagination: {
      page,
      limit,
      total: count,
      total_pages: Math.ceil((count || 0) / limit),
    },
  };
}

// Get alumni statistics
async function getAlumniStats(supabaseClient: any) {
  const { data, error } = await supabaseClient
    .from("alumni")
    .select("tahun_lulus")
    .order("tahun_lulus", { ascending: false });

  if (error) throw error;

  // Group by tahun
  const stats: Record<number, number> = {};
  (data || []).forEach((a: any) => {
    stats[a.tahun_lulus] = (stats[a.tahun_lulus] || 0) + 1;
  });

  return {
    total: (data || []).length,
    by_tahun: stats,
  };
}

// HTTP Handler
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

    let result: any;

    // Routes
    // GET /graduation-api - List all graduation jobs
    if (pathParts.length === 1 && pathParts[0] === "graduation-api" && method === "GET") {
      result = await listGraduationJobs(supabaseClient);
    }
    // POST /graduation-api/preview - Preview graduation
    else if (pathParts.length === 2 && pathParts[0] === "graduation-api" && pathParts[1] === "preview" && method === "POST") {
      const body = await req.json();
      result = await previewGraduation(supabaseClient, body.academic_term_id);
    }
    // POST /graduation-api/execute - Execute graduation
    else if (pathParts.length === 1 && pathParts[0] === "graduation-api" && method === "POST" && url.searchParams.get("action") === "execute") {
      const body = await req.json();
      result = await executeGraduation(supabaseClient, body.academic_term_id, body.tahun_lulus, user.id);
    }
    // GET /graduation-api/{id} - Get job details
    else if (pathParts.length === 2 && pathParts[0] === "graduation-api" && method === "GET") {
      const jobId = pathParts[1];
      result = await getGraduationJob(supabaseClient, jobId);
    }
    // GET /graduation-api/alumni - Get alumni list
    else if (pathParts.length === 2 && pathParts[0] === "graduation-api" && pathParts[1] === "alumni" && method === "GET") {
      result = await getAlumniList(supabaseClient, url.searchParams);
    }
    // GET /graduation-api/alumni/stats - Get alumni statistics
    else if (pathParts.length === 3 && pathParts[0] === "graduation-api" && pathParts[1] === "alumni" && pathParts[2] === "stats" && method === "GET") {
      result = await getAlumniStats(supabaseClient);
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
