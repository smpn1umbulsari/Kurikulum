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

// Get kepala sekolah dashboard
async function getKepsekDashboard(supabaseClient: any) {
  // Basic stats from view
  const { data: basicStats, error: basicError } = await supabaseClient
    .from("v_dashboard_kepsek")
    .select("*")
    .single();
  if (basicError) throw basicError;

  // Get siswa by tingkat
  const { data: siswaByTingkat, error: tingkatError } = await supabaseClient
    .from("v_kelas_siswa_count")
    .select("tingkat, jumlah_siswa")
    .order("tingkat", { ascending: true });
  if (tingkatError) console.error("tingkatError:", tingkatError);

  // Get latest academic term
  const { data: latestTerm, error: termError } = await supabaseClient
    .from("academic_terms")
    .select("*")
    .eq("status", "AKTIF")
    .single();
  if (termError) console.error("termError:", termError);

  // Get kelas breakdown
  const { data: kelasList, error: kelasError } = await supabaseClient
    .from("kelas")
    .select("id, nama_kelas, tingkat, jenis")
    .eq("status_aktif", true)
    .order("tingkat", { ascending: true })
    .order("nama_kelas", { ascending: true });
  if (kelasError) console.error("kelasError:", kelasError);

  // Calculate kelas stats
  const kelasStats = {
    reguler: (kelasList || []).filter((k: any) => k.jenis === "REGULER").length,
    akselerasi: (kelasList || []).filter((k: any) => k.jenis === "AKSELERASI").length,
    Paket: (kelasList || []).filter((k: any) => k.jenis === "PAKET").length,
  };

  return {
    timestamp: new Date().toISOString(),
    summary: {
      guru_aktif: basicStats?.guru_aktif || 0,
      siswa_aktif: basicStats?.siswa_aktif || 0,
      kelas_aktif: basicStats?.kelas_aktif || 0,
    },
    siswa_by_tingkat: siswaByTingkat || [],
    kelas_stats: kelasStats,
    kelas_list: kelasList || [],
    active_term: latestTerm,
  };
}

// Get kurikulum dashboard
async function getKurikulumDashboard(supabaseClient: any, termId?: string) {
  // Basic stats from view
  const { data: basicStats, error: basicError } = await supabaseClient
    .from("v_dashboard_kurikulum")
    .select("*")
    .single();
  if (basicError) throw basicError;

  // Get assessment stats by type
  const { data: assessmentsByType, error: typeError } = await supabaseClient
    .from("assessments")
    .select("jenis_id, jenis:jenis_assessments(nama)")
    .eq("stage", "PUBLISHED");

  // Get rapor snapshots by term
  const { data: raporSnapshots, error: raporError } = await supabaseClient
    .from("rapor_snapshots")
    .select(`
      *,
      term:academic_terms(tahun_ajaran, semester)
    `)
    .order("created_at", { ascending: false })
    .limit(10);

  // Get latest term
  const { data: latestTerm } = await supabaseClient
    .from("academic_terms")
    .select("*")
    .eq("status", "AKTIF")
    .single();

  // Get teacher workload
  const { data: workload, error: workloadError } = await supabaseClient
    .from("v_teacher_workload")
    .select("*")
    .order("jp_total", { ascending: false });
  if (workloadError) console.error("workloadError:", workloadError);

  // Get recent assessment activities
  let assessmentQuery = supabaseClient
    .from("assessments")
    .select(`
      id, title, stage, created_at,
      jenis:jenis_assessments(nama)
    `)
    .order("created_at", { ascending: false })
    .limit(10);

  if (termId && isValidUUID(termId)) {
    assessmentQuery = assessmentQuery.eq("academic_term_id", termId);
  }

  const { data: recentAssessments } = await assessmentQuery;

  // Get student performance summary
  let performanceSummary: any = { average_score: null, total_assessments: 0 };
  try {
    const { data: avgScore } = await supabaseClient
      .from("assessment_details")
      .select("nilai")
      .not("nilai", "is", null);
    
    if (avgScore && avgScore.length > 0) {
      const total = avgScore.reduce((sum: number, d: any) => sum + d.nilai, 0);
      performanceSummary = {
        average_score: Math.round((total / avgScore.length) * 100) / 100,
        total_assessments: avgScore.length,
      };
    }
  } catch (e) {
    console.error("Performance summary error:", e);
  }

  return {
    timestamp: new Date().toISOString(),
    summary: {
      assessment_draft: basicStats?.assessment_draft || 0,
      assessment_final: basicStats?.assessment_final || 0,
      rapor_final: basicStats?.rapor_final || 0,
    },
    performance_summary: performanceSummary,
    teacher_workload: (workload || []).slice(0, 20),
    recent_assessments: recentAssessments || [],
    rapor_snapshots: raporSnapshots || [],
    active_term: latestTerm,
  };
}

// Get teacher workload
async function getTeacherWorkload(
  supabaseClient: any,
  params: URLSearchParams
) {
  const page = parseInt(params.get("page") || "1");
  const limit = Math.min(parseInt(params.get("limit") || "20"), 100);
  const sortBy = params.get("sort_by") || "jp_total";
  const sortOrder = params.get("sort_order") || "desc";
  const offset = (page - 1) * limit;

  let query = supabaseClient
    .from("v_teacher_workload")
    .select("*", { count: "exact" });

  // Sorting
  if (sortBy === "nama") {
    query = query.order("nama", { ascending: sortOrder === "asc" });
  } else {
    query = query.order("jp_total", { ascending: sortOrder === "asc" });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  // Get teaching assignments detail
  const guruIds = (data || []).map((d: any) => d.guru_id);
  
  let assignments: any[] = [];
  if (guruIds.length > 0) {
    const { data: assignData } = await supabaseClient
      .from("pembagian_mengajar")
      .select(`
        guru_id,
        kelas:kelas(nama_kelas, tingkat),
        mapel:mata_pelajarans(nama),
        jp
      `)
      .in("guru_id", guruIds);
    assignments = assignData || [];
  }

  // Merge workload with assignments
  const enrichedData = (data || []).map((w: any) => ({
    ...w,
    assignments: assignments.filter((a: any) => a.guru_id === w.guru_id),
  }));

  return {
    workload: enrichedData,
    pagination: {
      page,
      limit,
      total: count,
      total_pages: Math.ceil((count || 0) / limit),
    },
  };
}

// Get analytics summary
async function getAnalyticsSummary(supabaseClient: any) {
  // Get current term
  const { data: currentTerm } = await supabaseClient
    .from("academic_terms")
    .select("*")
    .eq("status", "AKTIF")
    .single();

  // Total students by gender
  const { data: siswaGender } = await supabaseClient
    .from("siswas")
    .select("jk")
    .eq("status_aktif", true);

  const genderStats = {
    laki_laki: (siswaGender || []).filter((s: any) => s.jk === "L").length,
    perempuan: (siswaGender || []).filter((s: any) => s.jk === "P").length,
  };

  // Attendance summary
  let attendanceStats = { total: 0, hadir: 0, sakit: 0, izin: 0, alpha: 0 };
  if (currentTerm) {
    const { data: attendance } = await supabaseClient
      .from("kehadiran")
      .select("status")
      .eq("academic_term_id", currentTerm.id);
    
    if (attendance) {
      attendanceStats = {
        total: attendance.length,
        hadir: attendance.filter((a: any) => a.status === "HADIR").length,
        sakit: attendance.filter((a: any) => a.status === "SAKIT").length,
        izin: attendance.filter((a: any) => a.status === "IZIN").length,
        alpha: attendance.filter((a: any) => a.status === "ALPHA").length,
      };
    }
  }

  // Assessment completion
  const { data: assessments } = await supabaseClient
    .from("assessments")
    .select("id, stage")
    .eq("stage", "PUBLISHED");

  const assessmentStats = {
    published: (assessments || []).length,
    draft: 0,
    finalized: 0,
  };

  return {
    timestamp: new Date().toISOString(),
    current_term: currentTerm,
    student_demographics: {
      total: genderStats.laki_laki + genderStats.perempuan,
      laki_laki: genderStats.laki_laki,
      perempuan: genderStats.perempuan,
    },
    attendance_summary: attendanceStats,
    assessment_stats: assessmentStats,
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

    let result: any;

    // Routes (RLS-aware)
    // GET /dashboard-api/kepsek - Kepala sekolah dashboard
    if (pathParts.length === 1 && pathParts[0] === "dashboard-api" && method === "GET" && url.searchParams.get("type") === "kepsek") {
      result = await getKepsekDashboard(supabaseClient);
    }
    // GET /dashboard-api/kurikulum - Kurikulum dashboard
    else if (pathParts.length === 1 && pathParts[0] === "dashboard-api" && method === "GET" && url.searchParams.get("type") === "kurikulum") {
      const termId = url.searchParams.get("term_id") || undefined;
      result = await getKurikulumDashboard(supabaseClient, termId);
    }
    // GET /dashboard-api/workload - Teacher workload summary
    else if (pathParts.length === 2 && pathParts[0] === "dashboard-api" && pathParts[1] === "workload" && method === "GET") {
      result = await getTeacherWorkload(supabaseClient, url.searchParams);
    }
    // GET /dashboard-api/analytics - Analytics summary
    else if (pathParts.length === 2 && pathParts[0] === "dashboard-api" && pathParts[1] === "analytics" && method === "GET") {
      result = await getAnalyticsSummary(supabaseClient);
    }
    // GET /dashboard-api - Default dashboard
    else if (pathParts.length === 1 && pathParts[0] === "dashboard-api" && method === "GET") {
      result = await getAnalyticsSummary(supabaseClient);
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
