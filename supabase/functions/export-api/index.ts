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
const RATE_LIMIT = 20;
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

// Generate rapor data for PDF export
async function generateRaporExport(
  supabaseClient: any,
  siswaId: string,
  termId: string,
  includeWatermark: boolean = false
) {
  if (!isValidUUID(siswaId)) {
    throw new Error("Invalid siswa_id format");
  }
  if (!isValidUUID(termId)) {
    throw new Error("Invalid term_id format");
  }

  // Get siswa info
  const { data: siswa, error: siswaError } = await supabaseClient
    .from("siswas")
    .select("*")
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
  const { data: riwayat } = await supabaseClient
    .from("riwayat_kelas")
    .select(`*, kelas:kelas(*)`)
    .eq("siswa_id", siswaId)
    .eq("academic_term_id", termId)
    .single();

  // Get mapel data with assessments
  let mapelData: any[] = [];
  if (riwayat?.kelas_real_id) {
    const { data: pembagian } = await supabaseClient
      .from("pembagian_mengajar")
      .select(`
        *,
        mapel:mata_pelajarans(*),
        guru:gurus(nama)
      `)
      .eq("kelas_id", riwayat.kelas_real_id)
      .eq("academic_term_id", termId);

    const pembagianIds = (pembagian || []).map((p: any) => p.id);

    if (pembagianIds.length > 0) {
      const { data: assessments } = await supabaseClient
        .from("assessments")
        .select("id, title, jenis_id, pembagian_mengajar_id")
        .in("pembagian_mengajar_id", pembagianIds)
        .eq("stage", "PUBLISHED");

      const assessmentIds = (assessments || []).map((a: any) => a.id);

      let details: any[] = [];
      if (assessmentIds.length > 0) {
        const { data: detailsData } = await supabaseClient
          .from("assessment_details")
          .select("assessment_id, nilai")
          .eq("siswa_id", siswaId)
          .in("assessment_id", assessmentIds);
        details = detailsData || [];
      }

      mapelData = (pembagian || []).map((p: any) => {
        const pAssessments = (assessments || []).filter(
          (a: any) => a.pembagian_mengajar_id === p.id
        );
        const pAssessmentIds = pAssessments.map((a: any) => a.id);
        const pDetails = details.filter((d: any) =>
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

  // Get catatan
  const { data: catatan } = await supabaseClient
    .from("catatan_wali_kelas")
    .select("*")
    .eq("siswa_id", siswaId)
    .eq("academic_term_id", termId)
    .single();

  // Get kehadiran
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

  // Generate HTML for PDF
  const htmlContent = generateRaporHTML({
    siswa,
    term,
    kelas: riwayat?.kelas,
    mapelData,
    catatan: catatan?.catatan,
    kehadiran: rekapHadir,
    watermark: includeWatermark ? "DRAFT" : undefined,
  });

  return {
    siswa,
    term,
    kelas: riwayat?.kelas,
    mapel: mapelData,
    catatan: catatan?.catatan,
    kehadiran: rekapHadir,
    html_content: htmlContent,
    export_type: "rapor",
    generated_at: new Date().toISOString(),
  };
}

// Helper: Get nilai description
function getDeskripsiNilai(nilai: number): string {
  if (nilai >= 90) return "Sangat baik dalam memahami materi";
  if (nilai >= 80) return "Baik dalam memahami materi";
  if (nilai >= 70) return "Cukup baik, perlu peningkatan";
  if (nilai >= 60) return "Perlu bimbingan lebih lanjut";
  return "Perlu perhatian khusus";
}

// Generate HTML for rapor
function generateRaporHTML(data: any): string {
  const { siswa, term, kelas, mapelData, catatan, kehadiran, watermark } = data;
  
  const mapelRows = (mapelData || [])
    .map((m: any) => `
      <tr>
        <td>${m.mapel?.kode || "-"}</td>
        <td>${m.mapel?.nama || "-"}</td>
        <td>${m.guru?.nama || "-"}</td>
        <td style="text-align: center;">${m.nilai !== null ? m.nilai.toFixed(2) : "-"}</td>
        <td>${m.deskripsi || "-"}</td>
      </tr>
    `)
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Rapor ${siswa?.nama || "Siswa"}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .info-table td { padding: 5px; }
    .grade-table { width: 100%; border-collapse: collapse; }
    .grade-table th, .grade-table td { border: 1px solid #000; padding: 8px; }
    .grade-table th { background: #f0f0f0; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); 
      font-size: 100px; color: rgba(255,0,0,0.1); z-index: -1; pointer-events: none; }
    .footer { margin-top: 30px; }
  </style>
</head>
<body>
  ${watermark ? `<div class="watermark">${watermark}</div>` : ""}
  <div class="header">
    <h1>LAPORAN HASIL BELAJAR</h1>
    <h2>${term?.tahun_ajaran || ""} - Semester ${term?.semester || ""}</h2>
  </div>
  
  <table class="info-table">
    <tr><td><strong>Nama</strong></td><td>: ${siswa?.nama || "-"}</td></tr>
    <tr><td><strong>NISN</strong></td><td>: ${siswa?.nisn || "-"}</td></tr>
    <tr><td><strong>NIPD</strong></td><td>: ${siswa?.nipd || "-"}</td></tr>
    <tr><td><strong>Kelas</strong></td><td>: ${kelas?.nama_kelas || "-"}</td></tr>
  </table>

  <h3>Nilai Perkembangan Belajar</h3>
  <table class="grade-table">
    <thead>
      <tr>
        <th>Kode</th>
        <th>Mata Pelajaran</th>
        <th>Guru Pengampu</th>
        <th>Nilai</th>
        <th>Deskripsi</th>
      </tr>
    </thead>
    <tbody>
      ${mapelRows || "<tr><td colspan='5'>Tidak ada data</td></tr>"}
    </tbody>
  </table>

  <h3>Ketidakhadiran</h3>
  <table class="info-table">
    <tr><td><strong>Sakit</strong></td><td>: ${kehadiran?.sakit || 0} hari</td></tr>
    <tr><td><strong>Izin</strong></td><td>: ${kehadiran?.izin || 0} hari</td></tr>
    <tr><td><strong>Alpha</strong></td><td>: ${kehadiran?.alpha || 0} hari</td></tr>
  </table>

  ${catatan ? `
  <h3>Catatan Wali Kelas</h3>
  <p>${catatan}</p>
  ` : ""}

  <div class="footer">
    <p>Dicetak pada: ${new Date().toLocaleString("id-ID")}</p>
  </div>
</body>
</html>
  `.trim();
}

// Export siswa data to Excel (returns JSON for client-side conversion)
async function exportSiswaExcel(
  supabaseClient: any,
  params: URLSearchParams
) {
  const kelasId = params.get("kelas_id");
  const termId = params.get("term_id");
  const status = params.get("status") || "AKTIF";

  let query = supabaseClient
    .from("siswas")
    .select(`
      id, nisn, nipd, nama, jk, agama, tempat_lahir, tanggal_lahir, alamat, 
      nama_ortu, no_hp_ortu, status
    `)
    .eq("status", status)
    .order("nama", { ascending: true });

  if (kelasId && isValidUUID(kelasId)) {
    // Get siswa in specific kelas
    const { data: riwayat } = await supabaseClient
      .from("riwayat_kelas")
      .select("siswa_id")
      .eq("kelas_real_id", kelasId)
      .eq("academic_term_id", termId || null)
      .is("tanggal_selesai", null);

    const siswaIds = (riwayat || []).map((r: any) => r.siswa_id);
    if (siswaIds.length > 0) {
      query = query.in("id", siswaIds);
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  // Convert to Excel-friendly format (CSV)
  const headers = ["NISN", "NIPD", "Nama", "JK", "Agama", "Tempat Lahir", "Tanggal Lahir", "Alamat", "Nama Orang Tua", "No HP Ortu"];
  const rows = (data || []).map((s: any) => [
    s.nisn || "",
    s.nipd || "",
    s.nama || "",
    s.jk || "",
    s.agama || "",
    s.tempat_lahir || "",
    s.tanggal_lahir ? new Date(s.tanggal_lahir).toLocaleDateString("id-ID") : "",
    s.alamat || "",
    s.nama_ortu || "",
    s.no_hp_ortu || "",
  ]);

  return {
    headers,
    rows,
    total: rows.length,
    export_type: "siswa_excel",
    generated_at: new Date().toISOString(),
  };
}

// Export guru data
async function exportGuruExcel(supabaseClient: any) {
  const { data, error } = await supabaseClient
    .from("gurus")
    .select(`
      id, nip, nama, jk, agama, email, no_hp, 
      jabatan, status_aktif
    `)
    .order("nama", { ascending: true });

  if (error) throw error;

  const headers = ["NIP", "Nama", "JK", "Agama", "Email", "No HP", "Jabatan", "Status"];
  const rows = (data || []).map((g: any) => [
    g.nip || "",
    g.nama || "",
    g.jk || "",
    g.agama || "",
    g.email || "",
    g.no_hp || "",
    g.jabatan || "",
    g.status_aktif ? "Aktif" : "Nonaktif",
  ]);

  return {
    headers,
    rows,
    total: rows.length,
    export_type: "guru_excel",
    generated_at: new Date().toISOString(),
  };
}

// Export rapor bulk (multiple students)
async function exportBulkRapor(
  supabaseClient: any,
  kelasId: string,
  termId: string,
  userId: string
) {
  if (!isValidUUID(kelasId)) {
    throw new Error("Invalid kelas_id format");
  }
  if (!isValidUUID(termId)) {
    throw new Error("Invalid term_id format");
  }

  // Get all students in kelas
  const { data: riwayatList, error: riwayatError } = await supabaseClient
    .from("riwayat_kelas")
    .select(`
      *,
      siswa:siswas(id, nisn, nipd, nama, jk)
    `)
    .eq("kelas_real_id", kelasId)
    .eq("academic_term_id", termId)
    .is("tanggal_selesai", null);

  if (riwayatError) throw riwayatError;

  const siswaIds = (riwayatList || []).map((r: any) => r.siswa_id);

  // Generate rapor for each student
  const raporJobs: any[] = [];
  
  for (const siswaId of siswaIds) {
    try {
      const raporData = await generateRaporExport(
        supabaseClient,
        siswaId,
        termId,
        false
      );
      raporJobs.push({
        siswa_id: siswaId,
        status: "SUCCESS",
        data: raporData,
      });
    } catch (err: any) {
      raporJobs.push({
        siswa_id: siswaId,
        status: "FAILED",
        error: err.message,
      });
    }
  }

  return {
    kelas_id: kelasId,
    term_id: termId,
    total_students: siswaIds.length,
    generated: raporJobs.filter((r: any) => r.status === "SUCCESS").length,
    failed: raporJobs.filter((r: any) => r.status === "FAILED").length,
    jobs: raporJobs,
    export_type: "bulk_rapor",
    generated_at: new Date().toISOString(),
  };
}

// Add watermark to existing HTML/PDF content
async function addWatermark(
  supabaseClient: any,
  content: string,
  watermarkText: string
) {
  // Add watermark to HTML content
  const watermarkedHtml = content.replace(
    /<body>/i,
    `<body><div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 120px; color: rgba(255,0,0,0.1); z-index: -1; pointer-events: none;">${watermarkText}</div>`
  );

  return {
    original_content: content,
    watermarked_content: watermarkedHtml,
    watermark_text: watermarkText,
  };
}

// HTTP Handler
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders, ...securityHeaders } });
  }

  try {
    // Rate limiting (lower for export operations)
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

    // Auth check for all operations (export contains sensitive data)
    let user: any = null;
    try {
      user = await getAuthenticatedUser(req);
    } catch (authError: any) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 401,
        headers: { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" },
      });
    }

    let result: any;

    // Routes
    // POST /export-api/pdf/rapor - Generate single rapor PDF (returns HTML)
    if (pathParts.length === 3 && pathParts[0] === "export-api" && pathParts[1] === "pdf" && pathParts[2] === "rapor" && method === "POST") {
      const body = await req.json();
      const includeWatermark = body.include_watermark || false;
      result = await generateRaporExport(
        supabaseClient,
        body.siswa_id,
        body.term_id,
        includeWatermark
      );
    }
    // POST /export-api/excel/siswa - Export siswa data to Excel
    else if (pathParts.length === 3 && pathParts[0] === "export-api" && pathParts[1] === "excel" && pathParts[2] === "siswa" && method === "POST") {
      result = await exportSiswaExcel(supabaseClient, url.searchParams);
    }
    // POST /export-api/excel/guru - Export guru data to Excel
    else if (pathParts.length === 3 && pathParts[0] === "export-api" && pathParts[1] === "excel" && pathParts[2] === "guru" && method === "POST") {
      result = await exportGuruExcel(supabaseClient);
    }
    // POST /export-api/zip/bulk - Bulk export rapor
    else if (pathParts.length === 3 && pathParts[0] === "export-api" && pathParts[1] === "zip" && pathParts[2] === "bulk" && method === "POST") {
      const body = await req.json();
      result = await exportBulkRapor(
        supabaseClient,
        body.kelas_id,
        body.term_id,
        user.id
      );
    }
    // POST /export-api/watermark - Add watermark to content
    else if (pathParts.length === 2 && pathParts[0] === "export-api" && pathParts[1] === "watermark" && method === "POST") {
      const body = await req.json();
      result = await addWatermark(supabaseClient, body.content, body.watermark_text);
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
