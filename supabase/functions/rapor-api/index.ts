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

// Helper function for nilai description
function getDeskripsiNilai(nilai: number): string {
  if (nilai >= 90) return "Sangat baik dalam memahami materi";
  if (nilai >= 80) return "Baik dalam memahami materi";
  if (nilai >= 70) return "Cukup baik, perlu peningkatan";
  if (nilai >= 60) return "Perlu bimbingan lebih lanjut";
  return "Perlu perhatian khusus";
}

// Get rapor semester siswa - OPTIMIZED: No N+1 queries
async function getRaporSiswa(supabaseClient: any, params: URLSearchParams) {
  const siswaId = params.get("siswa_id");
  const termId = params.get("term_id");

  if (!siswaId || !termId) {
    throw new Error("siswa_id and term_id required");
  }
  
  // Validate UUIDs
  if (!isValidUUID(siswaId)) {
    throw new Error("Invalid siswa_id format");
  }
  if (!isValidUUID(termId)) {
    throw new Error("Invalid term_id format");
  }

  // Get siswa info
  const { data: siswa, error: siswaError } = await supabaseClient
    .from("siswas")
    .select("id, nisn, nipd, nama, jk")
    .eq("id", siswaId)
    .single();
  if (siswaError) throw siswaError;

  // Get term info
  const { data: term, error: termError } = await supabaseClient
    .from("academic_terms")
    .select("*")
    .eq("id", termId)
    .single();
  if (termError) throw termError;

  // Get kelas siswa
  const { data: riwayat, error: riwayatError } = await supabaseClient
    .from("riwayat_kelas")
    .select(`
      *,
      kelas:kelas(id, nama_kelas, tingkat, jenis)
    `)
    .eq("siswa_id", siswaId)
    .eq("academic_term_id", termId)
    .single();
  if (riwayatError && riwayatError.code !== "PGRST116")
    throw riwayatError;

  // Get pembagian mengajar untuk kelas ini
  let mapelData: any[] = [];
  if (riwayat?.kelas_real_id) {
    const { data: pembagian, error: bagiError } = await supabaseClient
      .from("pembagian_mengajar")
      .select(`
        *,
        mapel:mata_pelajarans(id, kode, nama, kelompok),
        guru:gurus(id, nama)
      `)
      .eq("kelas_id", riwayat.kelas_real_id)
      .eq("academic_term_id", termId);
    if (bagiError) throw bagiError;

    const pembagianIds = (pembagian || []).map((p: any) => p.id);

    if (pembagianIds.length > 0) {
      // BULK QUERY 1: Get all published assessments
      const { data: allAssessments } = await supabaseClient
        .from("assessments")
        .select("id, pembagian_mengajar_id")
        .in("pembagian_mengajar_id", pembagianIds)
        .eq("stage", "PUBLISHED");

      const assessmentIds = (allAssessments || []).map((a: any) => a.id);

      // BULK QUERY 2: Get all assessment details for this student
      let allDetails: any[] = [];
      if (assessmentIds.length > 0) {
        const { data: detailsData } = await supabaseClient
          .from("assessment_details")
          .select("assessment_id, nilai")
          .eq("siswa_id", siswaId)
          .in("assessment_id", assessmentIds);
        allDetails = detailsData || [];
      }

      // Map data in memory
      mapelData = (pembagian || []).map((p: any) => {
        const pAssessments = (allAssessments || []).filter(
          (a: any) => a.pembagian_mengajar_id === p.id
        );
        const pAssessmentIds = pAssessments.map((a: any) => a.id);

        const pDetails = allDetails.filter((d: any) =>
          pAssessmentIds.includes(d.assessment_id)
        );
        const nilaiList = pDetails
          .map((d: any) => d.nilai)
          .filter((n: any) => n !== null);
        const avg = nilaiList.length > 0
          ? nilaiList.reduce((a: number, b: number) => a + b, 0) / nilaiList.length
          : null;

        return {
          mapel: p.mapel,
          guru: p.guru,
          nilai: avg,
          deskripsi: avg !== null ? getDeskripsiNilai(avg) : "Belum ada penilaian",
        };
      });
    }
  }

  // Get catatan wali kelas
  const { data: catatan } = await supabaseClient
    .from("catatan_wali_kelas")
    .select("*")
    .eq("siswa_id", siswaId)
    .eq("academic_term_id", termId)
    .single();

  // Get rekap kehadiran
  const { data: kehadiran } = await supabaseClient
    .from("kehadiran")
    .select("status")
    .eq("siswa_id", siswaId)
    .eq("academic_term_id", termId);

  const rekapHadir = {
    total: (kehadiran || []).length,
    hadir: (kehadiran || []).filter((k: any) => k.status === "HADIR").length,
    sakit: (kehadiran || []).filter((k: any) => k.status === "SAKIT").length,
    izin: (kehadiran || []).filter((k: any) => k.status === "IZIN").length,
    alpha: (kehadiran || []).filter((k: any) => k.status === "ALPHA").length,
  };

  return {
    siswa,
    term,
    kelas: riwayat?.kelas,
    mapel: mapelData,
    catatan: catatan?.catatan,
    kehadiran: rekapHadir,
  };
}

// Create/update catatan wali kelas
async function saveCatatan(supabaseClient: any, body: any, userId: string) {
  if (!body.term_id || !body.siswa_id) {
    throw new Error("term_id and siswa_id required");
  }
  
  // Validate UUIDs
  if (!isValidUUID(body.term_id)) {
    throw new Error("Invalid term_id format");
  }
  if (!isValidUUID(body.siswa_id)) {
    throw new Error("Invalid siswa_id format");
  }
  if (body.kelas_id && !isValidUUID(body.kelas_id)) {
    throw new Error("Invalid kelas_id format");
  }
  
  // Validate catatan length
  if (body.catatan && body.catatan.length > 1000) {
    throw new Error("catatan must be at most 1000 characters");
  }

  const { data, error } = await supabaseClient
    .from("catatan_wali_kelas")
    .upsert([{
      academic_term_id: body.term_id,
      siswa_id: body.siswa_id,
      kelas_id: body.kelas_id,
      catatan: body.catatan,
      created_by: userId,
    }], { onConflict: "academic_term_id,siswa_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Get rapor kelas - OPTIMIZED: No N+1 queries
async function getRaporKelas(supabaseClient: any, params: URLSearchParams) {
  const kelasId = params.get("kelas_id");
  const termId = params.get("term_id");

  if (!kelasId || !termId) {
    throw new Error("kelas_id and term_id required");
  }
  
  // Validate UUIDs
  if (!isValidUUID(kelasId)) {
    throw new Error("Invalid kelas_id format");
  }
  if (!isValidUUID(termId)) {
    throw new Error("Invalid term_id format");
  }

  // Get all siswa in kelas
  const { data: riwayatList, error: riwayatError } = await supabaseClient
    .from("riwayat_kelas")
    .select(`
      *,
      siswa:siswas(id, nisn, nipd, nama, jk)
    `)
    .eq("kelas_real_id", kelasId)
    .eq("academic_term_id", termId);
  if (riwayatError) throw riwayatError;

  const siswaIds = (riwayatList || []).map((r: any) => r.siswa_id);

  // BULK QUERY: Fetch all student attendance
  let allKehadiran: any[] = [];
  if (siswaIds.length > 0) {
    const { data: kehData, error: kehError } = await supabaseClient
      .from("kehadiran")
      .select("siswa_id, status")
      .in("siswa_id", siswaIds)
      .eq("academic_term_id", termId);
    if (kehError) throw kehError;
    allKehadiran = kehData || [];
  }

  // Map to student list
  const raporList = (riwayatList || []).map((r: any) => {
    const sKehadiran = allKehadiran.filter((k: any) => k.siswa_id === r.siswa_id);
    const hadir = sKehadiran.filter((k: any) => k.status === "HADIR").length;
    const total = sKehadiran.length;

    return {
      siswa: r.siswa,
      kehadiran: {
        hadir,
        total,
        persensi: total > 0 ? Math.round((hadir / total) * 100) : 0,
      },
    };
  });

  return raporList;
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
    if (pathParts.length === 1 && pathParts[0] === "rapor-api" && method === "GET") {
      result = await getRaporSiswa(supabaseClient, url.searchParams);
    }
    else if (pathParts.length === 1 && pathParts[0] === "rapor-api" && method === "POST") {
      const body = await req.json();
      result = await saveCatatan(supabaseClient, body, user.id);
    }
    else if (pathParts.length === 2 && pathParts[0] === "rapor-api" && pathParts[1] === "kelas" && method === "GET") {
      result = await getRaporKelas(supabaseClient, url.searchParams);
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
