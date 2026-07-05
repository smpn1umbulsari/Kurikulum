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

// Authentication helper (uses admin client for auth check)
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

// List all promotion jobs
async function listPromotionJobs(supabaseClient: any) {
  const { data, error } = await supabaseClient
    .from("promotion_jobs")
    .select(`
      *,
      source_term:academic_terms!source_term_id(id, tahun_ajaran, semester),
      target_term:academic_terms!target_term_id(id, tahun_ajaran, semester)
    `)
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  return data;
}

// Get single promotion job with details
async function getPromotionJob(supabaseClient: any, jobId: string) {
  // Get job info
  const { data: job, error: jobError } = await supabaseClient
    .from("promotion_jobs")
    .select(`
      *,
      source_term:academic_terms!source_term_id(id, tahun_ajaran, semester),
      target_term:academic_terms!target_term_id(id, tahun_ajaran, semester),
      creator:gurus!created_by(id, nama)
    `)
    .eq("id", jobId)
    .single();
  
  if (jobError) throw jobError;

  // Get details
  const { data: details, error: detailsError } = await supabaseClient
    .from("promotion_details")
    .select(`
      *,
      siswa:siswas(id, nisn, nipd, nama, jk),
      kelas_asal:kelas!kelas_asal_id(id, nama_kelas, tingkat),
      kelas_tujuan:kelas!kelas_tujuan_id(id, nama_kelas, tingkat)
    `)
    .eq("promotion_job_id", jobId)
    .order("created_at", { ascending: true });
  
  if (detailsError) throw detailsError;

  return { ...job, details };
}

// Preview promotion - calculate students who will be promoted
async function previewPromotion(
  supabaseClient: any,
  sourceTermId: string,
  targetTermId: string
) {
  // Validate UUIDs
  if (!isValidUUID(sourceTermId)) {
    throw new Error("Invalid source_term_id format");
  }
  if (!isValidUUID(targetTermId)) {
    throw new Error("Invalid target_term_id format");
  }

  // Get source and target academic terms
  const { data: sourceTerm, error: sourceError } = await supabaseClient
    .from("academic_terms")
    .select("*")
    .eq("id", sourceTermId)
    .single();
  if (sourceError) throw sourceError;

  const { data: targetTerm, error: targetError } = await supabaseClient
    .from("academic_terms")
    .select("*")
    .eq("id", targetTermId)
    .single();
  if (targetError) throw targetError;

  // Get current classes (source term)
  const { data: kelasList, error: kelasError } = await supabaseClient
    .from("kelas")
    .select("id, nama_kelas, tingkat, jenis")
    .eq("academic_term_id", sourceTermId);
  if (kelasError) throw kelasError;

  // Get students who will be promoted
  const { data: riwayatList, error: riwayatError } = await supabaseClient
    .from("riwayat_kelas")
    .select(`
      *,
      siswa:siswas(id, nisn, nipd, nama, jk, status),
      kelas:kelas(id, nama_kelas, tingkat, jenis)
    `)
    .eq("academic_term_id", sourceTermId)
    .is("tanggal_selesai", null);
  if (riwayatError) throw riwayatError;

  // Calculate target kelas for each student (increment tingkat)
  const previewData = (riwayatList || [])
    .filter((r: any) => r.siswa?.status === "AKTIF")
    .map((r: any) => {
      // Find target kelas (same jenis, tingkat + 1)
      const currentTingkat = r.kelas?.tingkat || 10;
      const nextTingkat = currentTingkat + 1;
      const jenis = r.kelas?.jenis || "REGULER";
      
      // Special case for graduation (tingkat 12 -> no promotion)
      const willGraduate = currentTingkat >= 12;
      
      return {
        siswa: r.siswa,
        kelas_asal: r.kelas,
        tingkat_selanjutnya: willGraduate ? null : nextTingkat,
        will_graduate: willGraduate,
        target_kelas_suggestion: willGraduate 
          ? null 
          : `${jenis === "AKSELERASI" ? " Aks" : "X"}${nextTingkat}`,
      };
    });

  // Group by target tingkat
  const summary = {
    total_siswa: previewData.length,
    will_promote: previewData.filter((p: any) => !p.will_graduate).length,
    will_graduate: previewData.filter((p: any) => p.will_graduate).length,
    by_tingkat: {} as Record<number, number>,
  };

  previewData.forEach((p: any) => {
    const tingkat = p.tingkat_selanjutnya || 0;
    summary.by_tingkat[tingkat] = (summary.by_tingkat[tingkat] || 0) + 1;
  });

  return {
    source_term: sourceTerm,
    target_term: targetTerm,
    summary,
    students: previewData,
  };
}

// Execute promotion - create job and process students
async function executePromotion(
  supabaseClient: any,
  sourceTermId: string,
  targetTermId: string,
  userId: string
) {
  // Validate UUIDs
  if (!isValidUUID(sourceTermId)) {
    throw new Error("Invalid source_term_id format");
  }
  if (!isValidUUID(targetTermId)) {
    throw new Error("Invalid target_term_id format");
  }

  // Get preview data first
  const preview = await previewPromotion(supabaseClient, sourceTermId, targetTermId);

  // Create promotion job
  const { data: job, error: jobError } = await supabaseClient
    .from("promotion_jobs")
    .insert({
      source_term_id: sourceTermId,
      target_term_id: targetTermId,
      status: "PENDING",
      total_siswa: preview.summary.will_promote,
      processed_siswa: 0,
      created_by: userId,
    })
    .select()
    .single();
  
  if (jobError) throw jobError;

  // FIX: Get all target classes ONCE before the loop
  const { data: targetKelasList } = await supabaseClient
    .from("kelas")
    .select("id, tingkat, jenis")
    .eq("academic_term_id", targetTermId);

  // Process each student promotion
  const processPromotions = async () => {
    const studentsToPromote = preview.students.filter((s: any) => !s.will_graduate);
    const processed: any[] = [];
    
    for (const student of studentsToPromote) {
      try {
        // Find target kelas (same jenis, tingkat + 1)
        const currentKelas = student.kelas_asal;
        const nextTingkat = currentKelas?.tingkat + 1 || 10;
        const jenis = currentKelas?.jenis || "REGULER";
        
        // FIX: Find target kelas from pre-loaded list (no N+1 query)
        const targetKelas = (targetKelasList || []).find(
          (k: any) => k.tingkat === nextTingkat && k.jenis === jenis
        );

        if (targetKelas) {
          // Call database function to execute promotion
          const { error: execError } = await supabaseClient
            .rpc("execute_siswa_promotion", {
              p_job_id: job.id,
              p_siswa_id: student.siswa.id,
              p_kelas_asal_id: currentKelas.id,
              p_kelas_tujuan_id: targetKelas.id,
            });

          if (execError) {
            throw execError;
          }
        } else {
          throw new Error(`Target kelas not found for tingkat ${nextTingkat}, jenis ${jenis}`);
        }

        processed.push({ siswa_id: student.siswa.id, status: "SUCCESS" });
      } catch (err: any) {
        // Insert failed detail
        await supabaseClient
          .from("promotion_details")
          .insert({
            promotion_job_id: job.id,
            siswa_id: student.siswa.id,
            kelas_asal_id: student.kelas_asal?.id,
            status: "FAILED",
            message: err.message,
          });

        processed.push({ siswa_id: student.siswa.id, status: "FAILED", error: err.message });
      }

      // FIX: Update progress only every 10 students or at the end
      if (processed.length % 10 === 0 || processed.length === studentsToPromote.length) {
        await supabaseClient
          .from("promotion_jobs")
          .update({ 
            processed_siswa: processed.length,
            status: "PROCESSING",
          })
          .eq("id", job.id);
      }
    }

    return processed;
  };

  // Execute promotions asynchronously
  // In production, this should be done via a background job
  const results = await processPromotions();

  // Update job status
  const failedCount = results.filter((r: any) => r.status === "FAILED").length;
  const finalStatus = failedCount === 0 ? "COMPLETED" : (failedCount === results.length ? "FAILED" : "COMPLETED_WITH_ERRORS");

  await supabaseClient
    .from("promotion_jobs")
    .update({
      status: finalStatus,
      processed_siswa: results.length,
      finished_at: new Date().toISOString(),
      log: { results, failed_count: failedCount },
    })
    .eq("id", job.id);

  return {
    job_id: job.id,
    status: finalStatus,
    total: results.length,
    success: results.filter((r: any) => r.status === "SUCCESS").length,
    failed: failedCount,
  };
}

// Rollback promotion job
async function rollbackPromotion(
  supabaseClient: any,
  jobId: string,
  userId: string
) {
  if (!isValidUUID(jobId)) {
    throw new Error("Invalid job_id format");
  }

  // Get job details
  const { data: job, error: jobError } = await supabaseClient
    .from("promotion_jobs")
    .select("*")
    .eq("id", jobId)
    .single();
  
  if (jobError) throw jobError;

  if (job.status === "COMPLETED" || job.status === "COMPLETED_WITH_ERRORS") {
    // Get promotion details
    const { data: details, error: detailsError } = await supabaseClient
      .from("promotion_details")
      .select("*")
      .eq("promotion_job_id", jobId)
      .eq("status", "SUCCESS");
    
    if (detailsError) throw detailsError;

    // Rollback each student
    const rollbackResults: any[] = [];
    for (const detail of details || []) {
      try {
        // Revert riwayat_kelas
        // Find the latest record for this siswa in target term
        const { data: latestRecord } = await supabaseClient
          .from("riwayat_kelas")
          .select("*")
          .eq("siswa_id", detail.siswa_id)
          .eq("kelas_real_id", detail.kelas_tujuan_id)
          .is("tanggal_selesai", null)
          .limit(1)
          .single();

        if (latestRecord) {
          // Close the current record
          await supabaseClient
            .from("riwayat_kelas")
            .update({ tanggal_selesai: new Date().toISOString() })
            .eq("id", latestRecord.id);

          // Reopen the old record
          await supabaseClient
            .from("riwayat_kelas")
            .update({ tanggal_selesai: null })
            .eq("siswa_id", detail.siswa_id)
            .eq("kelas_real_id", detail.kelas_asal_id)
            .not("tanggal_selesai", "is", null)
            .order("tanggal_selesai", { ascending: false })
            .limit(1);
        }

        rollbackResults.push({ siswa_id: detail.siswa_id, status: "ROLLED_BACK" });
      } catch (err: any) {
        rollbackResults.push({ siswa_id: detail.siswa_id, status: "FAILED", error: err.message });
      }
    }

    // Update job status
    await supabaseClient
      .from("promotion_jobs")
      .update({
        status: "ROLLED_BACK",
        log: { rollback_results: rollbackResults },
      })
      .eq("id", jobId);

    return {
      job_id: jobId,
      status: "ROLLED_BACK",
      rolled_back: rollbackResults.filter((r: any) => r.status === "ROLLED_BACK").length,
      failed: rollbackResults.filter((r: any) => r.status === "FAILED").length,
    };
  }

  throw new Error("Cannot rollback job with status: " + job.status);
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

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const method = req.method;
    
    // Use appropriate client based on operation type
    const isWriteOperation = method === "POST" || method === "PUT" || method === "DELETE";
    
    // Auth check for write operations
    let user: any = null;
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

    // Write operations use admin client (promotion needs bypass RLS)
    // Read operations use user client (RLS-aware)
    const supabaseClient = isWriteOperation 
      ? createAdminClient() 
      : createSupabaseClient(req);

    let result: any;

    // Routes
    // GET /promotion-api - List all jobs (RLS-aware)
    if (pathParts.length === 1 && pathParts[0] === "promotion-api" && method === "GET") {
      result = await listPromotionJobs(supabaseClient);
    }
    // POST /promotion-api/preview - Preview promotion
    else if (pathParts.length === 2 && pathParts[0] === "promotion-api" && pathParts[1] === "preview" && method === "POST") {
      const body = await req.json();
      result = await previewPromotion(supabaseClient, body.source_term_id, body.target_term_id);
    }
    // POST /promotion-api/execute - Execute promotion
    else if (pathParts.length === 1 && pathParts[0] === "promotion-api" && method === "POST" && url.searchParams.get("action") === "execute") {
      const body = await req.json();
      result = await executePromotion(supabaseClient, body.source_term_id, body.target_term_id, user.id);
    }
    // GET /promotion-api/{id} - Get job details
    else if (pathParts.length === 2 && pathParts[0] === "promotion-api" && method === "GET") {
      const jobId = pathParts[1];
      result = await getPromotionJob(supabaseClient, jobId);
    }
    // POST /promotion-api/{id}/rollback - Rollback job
    else if (pathParts.length === 3 && pathParts[0] === "promotion-api" && pathParts[2] === "rollback" && method === "POST") {
      const jobId = pathParts[1];
      result = await rollbackPromotion(supabaseClient, jobId, user.id);
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
