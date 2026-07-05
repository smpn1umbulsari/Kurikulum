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
const RATE_LIMIT = 50;
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

// Tables to archive for academic year
const ARCHIVE_TABLES = [
  "assessments",
  "assessment_details",
  "kehadiran",
  "catatan_wali_kelas",
  "rapor_snapshots",
];

// List all archive jobs
async function listArchiveJobs(supabaseClient: any) {
  const { data, error } = await supabaseClient
    .from("archive_jobs")
    .select(`
      *,
      term:academic_terms(id, tahun_ajaran, semester),
      creator:gurus!created_by(id, nama)
    `)
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  return data;
}

// Get single archive job with details
async function getArchiveJob(supabaseClient: any, jobId: string) {
  if (!isValidUUID(jobId)) {
    throw new Error("Invalid job_id format");
  }

  // Get job info
  const { data: job, error: jobError } = await supabaseClient
    .from("archive_jobs")
    .select(`
      *,
      term:academic_terms(id, tahun_ajaran, semester),
      creator:gurus!created_by(id, nama)
    `)
    .eq("id", jobId)
    .single();
  
  if (jobError) throw jobError;

  // Get archive records summary
  const { data: recordsSummary } = await supabaseClient
    .from("archive_records")
    .select("table_name")
    .eq("archive_job_id", jobId);

  // Group by table
  const summaryByTable: Record<string, number> = {};
  (recordsSummary || []).forEach((r: any) => {
    summaryByTable[r.table_name] = (summaryByTable[r.table_name] || 0) + 1;
  });

  return { ...job, summary_by_table: summaryByTable };
}

// Preview archive - calculate records to archive
async function previewArchive(
  supabaseClient: any,
  academicTermId: string
) {
  if (!isValidUUID(academicTermId)) {
    throw new Error("Invalid academic_term_id format");
  }

  // Get term info
  const { data: term, error: termError } = await supabaseClient
    .from("academic_terms")
    .select("*")
    .eq("id", academicTermId)
    .single();
  if (termError) throw termError;

  // Count records per table
  const previewData: Record<string, number> = {};
  let totalRecords = 0;

  // Get active assessment IDs for the term (for assessment_details filter)
  const { data: activeAssessments } = await supabaseClient
    .from("assessments")
    .select("id")
    .eq("academic_term_id", academicTermId);
  
  const assessmentIds = (activeAssessments || []).map((a: any) => a.id);

  for (const table of ARCHIVE_TABLES) {
    try {
      let count = 0;
      
      if (table === "assessments") {
        const result = await supabaseClient
          .from(table)
          .select("*", { count: "exact", head: true })
          .eq("academic_term_id", academicTermId);
        count = result.count || 0;
      } else if (table === "assessment_details") {
        // FIX: Filter by assessment_ids for the active term
        if (assessmentIds.length > 0) {
          const result = await supabaseClient
            .from(table)
            .select("*", { count: "exact", head: true })
            .in("assessment_id", assessmentIds);
          count = result.count || 0;
        }
      } else if (table === "kehadiran" || table === "catatan_wali_kelas" || table === "rapor_snapshots") {
        const result = await supabaseClient
          .from(table)
          .select("*", { count: "exact", head: true })
          .eq("academic_term_id", academicTermId);
        count = result.count || 0;
      }
      
      previewData[table] = count;
      totalRecords += count;
    } catch (e) {
      previewData[table] = 0;
    }
  }

  return {
    academic_term: term,
    preview: previewData,
    total_records: totalRecords,
  };
}

// Create archive job
async function createArchiveJob(
  supabaseClient: any,
  academicTermId: string,
  userId: string
) {
  if (!isValidUUID(academicTermId)) {
    throw new Error("Invalid academic_term_id format");
  }

  // Check if archive job already exists for this term
  const { data: existing } = await supabaseClient
    .from("archive_jobs")
    .select("id")
    .eq("academic_term_id", academicTermId)
    .eq("status", "COMPLETED")
    .single();

  if (existing) {
    throw new Error("Archive already exists for this academic term. Please use restore instead.");
  }

  // Create job
  const { data: job, error: jobError } = await supabaseClient
    .from("archive_jobs")
    .insert({
      academic_term_id: academicTermId,
      status: "PENDING",
      total_records: 0,
      processed_records: 0,
      created_by: userId,
    })
    .select()
    .single();
  
  if (jobError) throw jobError;

  return {
    job_id: job.id,
    status: "PENDING",
    academic_term_id: academicTermId,
  };
}

// Execute archive job
async function executeArchiveJob(
  supabaseClient: any,
  jobId: string,
  userId: string
) {
  if (!isValidUUID(jobId)) {
    throw new Error("Invalid job_id format");
  }

  // Get job
  const { data: job, error: jobError } = await supabaseClient
    .from("archive_jobs")
    .select("*")
    .eq("id", jobId)
    .single();
  
  if (jobError) throw jobError;

  if (job.status !== "PENDING") {
    throw new Error(`Cannot execute job with status: ${job.status}`);
  }

  // Update status to processing
  await supabaseClient
    .from("archive_jobs")
    .update({ status: "PROCESSING" })
    .eq("id", jobId);

  const processed: any[] = [];
  const CHUNK_SIZE = 200; // Bulk insert chunk size

  // Get active assessment IDs for assessment_details filter
  const { data: activeAssessments } = await supabaseClient
    .from("assessments")
    .select("id")
    .eq("academic_term_id", job.academic_term_id);
  
  const assessmentIds = (activeAssessments || []).map((a: any) => a.id);

  // Archive each table
  for (const table of ARCHIVE_TABLES) {
    try {
      // Fetch all records for this term
      let query = supabaseClient.from(table).select("*");
      
      // Add term filter based on table
      if (table === "assessments" || table === "kehadiran" || table === "catatan_wali_kelas" || table === "rapor_snapshots") {
        query = query.eq("academic_term_id", job.academic_term_id);
      } else if (table === "assessment_details") {
        // FIX: Filter by assessment_ids for active term
        if (assessmentIds.length > 0) {
          query = query.in("assessment_id", assessmentIds);
        } else {
          // No assessments for this term, skip
          processed.push({ table, record_id: null, status: "SKIPPED", message: "No assessments for this term" });
          continue;
        }
      }

      const { data: records, error: fetchError } = await query;
      
      if (fetchError) {
        throw fetchError;
      }

      if (!records || records.length === 0) {
        processed.push({ table, record_id: null, status: "SKIPPED", message: "No records to archive" });
        continue;
      }

      // FIX: Bulk insert in chunks of 200 records
      const allArchivePayloads: any[] = [];
      
      for (const record of records) {
        allArchivePayloads.push({
          archive_job_id: jobId,
          table_name: table,
          record_id: record.id,
          snapshot_data: record,
        });
      }

      // Insert in chunks
      for (let i = 0; i < allArchivePayloads.length; i += CHUNK_SIZE) {
        const chunk = allArchivePayloads.slice(i, i + CHUNK_SIZE);
        const { error: insertError } = await supabaseClient
          .from("archive_records")
          .insert(chunk);
        
        if (insertError) {
          // Log failed records individually
          for (const record of records.slice(i, i + CHUNK_SIZE)) {
            processed.push({ table, record_id: record.id, status: "FAILED", error: insertError.message });
          }
        } else {
          // Log success
          for (const record of records.slice(i, i + CHUNK_SIZE)) {
            processed.push({ table, record_id: record.id, status: "ARCHIVED" });
          }
        }
      }

      // Create academic snapshot for the term
      await supabaseClient
        .from("academic_snapshots")
        .insert({
          academic_term_id: job.academic_term_id,
          snapshot_type: `${table}_archive`,
          data: { 
            table_name: table,
            record_count: records.length, 
            archived_job_id: jobId,
            archived_at: new Date().toISOString()
          },
        });
    } catch (err: any) {
      processed.push({ table, status: "FAILED", error: err.message });
    }
  }

  // Update job status
  const failedCount = processed.filter((p: any) => p.status === "FAILED").length;
  const archivedCount = processed.filter((p: any) => p.status === "ARCHIVED").length;
  const finalStatus = failedCount === 0 ? "COMPLETED" : (archivedCount === 0 ? "FAILED" : "COMPLETED_WITH_ERRORS");

  await supabaseClient
    .from("archive_jobs")
    .update({
      status: finalStatus,
      total_records: archivedCount,
      processed_records: processed.length,
      finished_at: new Date().toISOString(),
      log: { processed, failed_count: failedCount, archived_count: archivedCount },
    })
    .eq("id", jobId);

  return {
    job_id: jobId,
    status: finalStatus,
    total_archived: archivedCount,
    total_failed: failedCount,
    chunk_size: CHUNK_SIZE,
  };
}

// Restore from archive
async function restoreFromArchive(
  supabaseClient: any,
  jobId: string,
  tableNames?: string[]
) {
  if (!isValidUUID(jobId)) {
    throw new Error("Invalid job_id format");
  }

  // Get job
  const { data: job, error: jobError } = await supabaseClient
    .from("archive_jobs")
    .select("*")
    .eq("id", jobId)
    .single();
  
  if (jobError) throw jobError;

  if (job.status !== "COMPLETED") {
    throw new Error("Can only restore from completed archive jobs");
  }

  // Get archive records
  let query = supabaseClient
    .from("archive_records")
    .select("*")
    .eq("archive_job_id", jobId);

  if (tableNames && tableNames.length > 0) {
    query = query.in("table_name", tableNames);
  }

  const { data: records, error: recordsError } = await query;
  if (recordsError) throw recordsError;

  const restored: any[] = [];

  // Restore each record
  for (const record of records || []) {
    try {
      // Check if record already exists
      const { data: existing } = await supabaseClient
        .from(record.table_name)
        .select("id")
        .eq("id", record.record_id)
        .single();

      if (existing) {
        // Update
        await supabaseClient
          .from(record.table_name)
          .update(record.snapshot_data)
          .eq("id", record.record_id);
      } else {
        // Insert
        await supabaseClient
          .from(record.table_name)
          .insert(record.snapshot_data);
      }

      restored.push({ table: record.table_name, record_id: record.record_id, status: "RESTORED" });
    } catch (err: any) {
      restored.push({ table: record.table_name, record_id: record.record_id, status: "FAILED", error: err.message });
    }
  }

  return {
    job_id: jobId,
    total_restored: restored.filter((r: any) => r.status === "RESTORED").length,
    total_failed: restored.filter((r: any) => r.status === "FAILED").length,
    details: restored,
  };
}

// Get academic snapshots
async function getAcademicSnapshots(
  supabaseClient: any,
  params: URLSearchParams
) {
  const termId = params.get("term_id");
  const snapshotType = params.get("type");

  let query = supabaseClient
    .from("academic_snapshots")
    .select(`
      *,
      term:academic_terms(tahun_ajaran, semester)
    `)
    .order("generated_at", { ascending: false });

  if (termId && isValidUUID(termId)) {
    query = query.eq("academic_term_id", termId);
  }

  if (snapshotType) {
    query = query.eq("snapshot_type", snapshotType);
  }

  const { data, error } = await query;
  if (error) throw error;

  return { snapshots: data };
}

// HTTP Handler
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders, ...securityHeaders } });
  }

  try {
    // Rate limiting (lower for archive operations)
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

    // Write operations use admin client (archive, restore need bypass RLS)
    // Read operations use user client (RLS-aware)
    const supabaseClient = isWriteOperation 
      ? createAdminClient() 
      : createSupabaseClient(req);

    let result: any;

    // Routes
    // GET /archive-api - List archive jobs (RLS-aware)
    if (pathParts.length === 1 && pathParts[0] === "archive-api" && method === "GET") {
      result = await listArchiveJobs(supabaseClient);
    }
    // POST /archive-api/preview - Preview archive (admin)
    else if (pathParts.length === 2 && pathParts[0] === "archive-api" && pathParts[1] === "preview" && method === "POST") {
      const body = await req.json();
      result = await previewArchive(supabaseClient, body.academic_term_id);
    }
    // POST /archive-api - Create archive job (admin)
    else if (pathParts.length === 1 && pathParts[0] === "archive-api" && method === "POST") {
      const body = await req.json();
      result = await createArchiveJob(supabaseClient, body.academic_term_id, user.id);
    }
    // POST /archive-api/{id}/execute - Execute archive (admin)
    else if (pathParts.length === 3 && pathParts[0] === "archive-api" && pathParts[2] === "execute" && method === "POST") {
      const jobId = pathParts[1];
      result = await executeArchiveJob(supabaseClient, jobId, user.id);
    }
    // GET /archive-api/{id} - Get archive job details (RLS-aware)
    else if (pathParts.length === 2 && pathParts[0] === "archive-api" && method === "GET") {
      const jobId = pathParts[1];
      result = await getArchiveJob(supabaseClient, jobId);
    }
    // POST /archive-api/{id}/restore - Restore from archive (admin)
    else if (pathParts.length === 3 && pathParts[0] === "archive-api" && pathParts[2] === "restore" && method === "POST") {
      const jobId = pathParts[1];
      const body = await req.json();
      result = await restoreFromArchive(supabaseClient, jobId, body.tables);
    }
    // GET /archive-api/snapshots - Get academic snapshots (RLS-aware)
    else if (pathParts.length === 2 && pathParts[0] === "archive-api" && pathParts[1] === "snapshots" && method === "GET") {
      result = await getAcademicSnapshots(supabaseClient, url.searchParams);
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
