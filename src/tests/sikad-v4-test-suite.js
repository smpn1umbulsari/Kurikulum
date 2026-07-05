/**
 * SIKAD v4.0 Test Suite
 * Tests all 8 API endpoints
 * 
 * Usage: 
 * 1. Set environment variables
 * 2. Run: node src/tests/sikad-v4-test-suite.js
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const SUPABASE_TEST_TOKEN = process.env.SUPABASE_TEST_TOKEN || 'your-jwt-token';

const BASE_URL = `${SUPABASE_URL}/functions/v1`;

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

let passed = 0;
let failed = 0;
let total = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    log(`✓ ${message}`, 'green');
  } else {
    failed++;
    log(`✗ ${message}`, 'red');
  }
}

async function fetchApi(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    ...(options.auth && { 'Authorization': `Bearer ${SUPABASE_TEST_TOKEN}` }),
    ...options.headers
  };
  
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    
    const data = await response.json().catch(() => null);
    return { status: response.status, data, ok: response.ok };
  } catch (error) {
    return { status: 0, data: null, ok: false, error: error.message };
  }
}

// ============================================
// GURU API TESTS
// ============================================
async function testGuruAPI() {
  log('\n--- Testing Guru API ---', 'blue');
  
  // Test list teachers
  let res = await fetchApi('/guru-api');
  assert(res.ok, 'GET /guru-api - List teachers');
  assert(Array.isArray(res.data?.data), 'GET /guru-api - Returns array');
  
  // Test create teacher (requires auth)
  res = await fetchApi('/guru-api', {
    method: 'POST',
    auth: true,
    body: {
      id: '00000000-0000-0000-0000-000000000001',
      nip: '19800115200001',
      nama: 'Test Guru',
      jk: 'L',
      tempat_lahir: 'Jakarta',
      tanggal_lahir: '1980-01-15',
      status: 'AKTIF'
    }
  });
  assert(res.ok, 'POST /guru-api - Create teacher (auth)');
  
  // Test get single teacher
  if (res.data?.data?.id) {
    res = await fetchApi(`/guru-api/${res.data.data.id}`);
    assert(res.ok, 'GET /guru-api/:id - Get single teacher');
    assert(res.data?.data?.nama === 'Test Guru', 'GET /guru-api/:id - Returns correct data');
  }
}

// ============================================
// SISWA API TESTS
// ============================================
async function testSiswaAPI() {
  log('\n--- Testing Siswa API ---', 'blue');
  
  // Test list students
  let res = await fetchApi('/siswa-api');
  assert(res.ok, 'GET /siswa-api - List students');
  assert(Array.isArray(res.data?.data), 'GET /siswa-api - Returns array');
  
  // Test search
  res = await fetchApi('/siswa-api?search=test');
  assert(res.ok, 'GET /siswa-api?search - Search students');
  
  // Test create student (requires auth)
  res = await fetchApi('/siswa-api', {
    method: 'POST',
    auth: true,
    body: {
      nisn: '1234567890',
      nipd: '2024001',
      nama: 'Test Siswa',
      jk: 'L',
      tempat_lahir: 'Jakarta',
      tanggal_lahir: '2010-01-15',
      status: 'AKTIF'
    }
  });
  assert(res.ok, 'POST /siswa-api - Create student (auth)');
}

// ============================================
// MAPEL API TESTS
// ============================================
async function testMapelAPI() {
  log('\n--- Testing Mapel API ---', 'blue');
  
  // Test list subjects
  let res = await fetchApi('/mapel-api');
  assert(res.ok, 'GET /mapel-api - List subjects');
  assert(Array.isArray(res.data?.data), 'GET /mapel-api - Returns array');
  
  // Test filter by kelompok
  res = await fetchApi('/mapel-api?kelompok=A');
  assert(res.ok, 'GET /mapel-api?kelompok - Filter by kelompok');
  
  // Test create subject (requires auth)
  res = await fetchApi('/mapel-api', {
    method: 'POST',
    auth: true,
    body: {
      kode: 'MTK',
      nama: 'Matematika',
      kelompok: 'A'
    }
  });
  assert(res.ok, 'POST /mapel-api - Create subject (auth)');
}

// ============================================
// ACADEMIC API TESTS
// ============================================
async function testAcademicAPI() {
  log('\n--- Testing Academic API ---', 'blue');
  
  // Test list terms
  let res = await fetchApi('/academic-api');
  assert(res.ok, 'GET /academic-api - List academic terms');
  assert(Array.isArray(res.data?.data), 'GET /academic-api - Returns array');
  
  // Test create term (requires auth)
  res = await fetchApi('/academic-api', {
    method: 'POST',
    auth: true,
    body: {
      tahun_ajaran: '2025/2026',
      semester: 'GANJIL',
      tanggal_mulai: '2025-07-15',
      tanggal_selesai: '2025-12-20',
      status: 'AKTIF'
    }
  });
  assert(res.ok, 'POST /academic-api - Create term (auth)');
}

// ============================================
// KELAS API TESTS
// ============================================
async function testKelasAPI() {
  log('\n--- Testing Kelas API ---', 'blue');
  
  // Test list classes
  let res = await fetchApi('/kelas-api');
  assert(res.ok, 'GET /kelas-api - List classes');
  assert(Array.isArray(res.data?.data), 'GET /kelas-api - Returns array');
  
  // Test filter by tingkat
  res = await fetchApi('/kelas-api?tingkat=10');
  assert(res.ok, 'GET /kelas-api?tingkat - Filter by tingkat');
  
  // Test create class (requires auth)
  res = await fetchApi('/kelas-api', {
    method: 'POST',
    auth: true,
    body: {
      nama_kelas: 'X IPA TEST',
      tingkat: 10,
      jenis: 'REAL',
      academic_term_id: '00000000-0000-0000-0000-000000000001'
    }
  });
  assert(res.ok, 'POST /kelas-api - Create class (auth)');
}

// ============================================
// ASSESSMENT API TESTS
// ============================================
async function testAssessmentAPI() {
  log('\n--- Testing Assessment API ---', 'blue');
  
  // Test list assessments
  let res = await fetchApi('/assessment-api');
  assert(res.ok, 'GET /assessment-api - List assessments');
  assert(Array.isArray(res.data?.data), 'GET /assessment-api - Returns array');
  
  // Test get assessment types
  res = await fetchApi('/assessment-api/types');
  assert(res.ok, 'GET /assessment-api/types - Get types');
  assert(Array.isArray(res.data), 'GET /assessment-api/types - Returns array');
  
  // Test create assessment (requires auth)
  res = await fetchApi('/assessment-api', {
    method: 'POST',
    auth: true,
    body: {
      assessment_type_id: '00000000-0000-0000-0000-000000000001',
      pembagian_mengajar_id: '00000000-0000-0000-0000-000000000001',
      academic_term_id: '00000000-0000-0000-0000-000000000001',
      judul: 'Ulangan Harian 1',
      deskripsi: 'Materi Bab 1',
      tanggal: '2025-09-15',
      bobot: 25
    }
  });
  assert(res.ok, 'POST /assessment-api - Create assessment (auth)');
  
  // Test input nilai (requires auth)
  if (res.data?.data?.id) {
    res = await fetchApi('/assessment-api/details', {
      method: 'POST',
      auth: true,
      body: {
        assessment_id: res.data.data.id,
        siswa_id: '00000000-0000-0000-0000-000000000001',
        nilai: 85.5,
        catatan: 'Baik'
      }
    });
    assert(res.ok, 'POST /assessment-api/details - Input nilai (auth)');
  }
}

// ============================================
// ATTENDANCE API TESTS
// ============================================
async function testAttendanceAPI() {
  log('\n--- Testing Attendance API ---', 'blue');
  
  // Test list attendance
  let res = await fetchApi('/attendance-api');
  assert(res.ok, 'GET /attendance-api - List attendance');
  assert(Array.isArray(res.data?.data), 'GET /attendance-api - Returns array');
  
  // Test get rekap
  res = await fetchApi('/attendance-api/rekap?siswa_id=00000000-0000-0000-0000-000000000001&tanggal_mulai=2025-01-01&tanggal_selesai=2025-12-31');
  assert(res.ok, 'GET /attendance-api/rekap - Get summary');
  
  // Test input attendance (requires auth)
  res = await fetchApi('/attendance-api', {
    method: 'POST',
    auth: true,
    body: {
      academic_term_id: '00000000-0000-0000-0000-000000000001',
      pembagian_mengajar_id: '00000000-0000-0000-0000-000000000001',
      siswa_id: '00000000-0000-0000-0000-000000000001',
      tanggal: '2025-09-16',
      status: 'HADIR'
    }
  });
  assert(res.ok, 'POST /attendance-api - Input attendance (auth)');
  
  // Test bulk input (requires auth)
  res = await fetchApi('/attendance-api', {
    method: 'POST',
    auth: true,
    body: {
      academic_term_id: '00000000-0000-0000-0000-000000000001',
      pembagian_mengajar_id: '00000000-0000-0000-0000-000000000001',
      tanggal: '2025-09-16',
      entries: [
        { siswa_id: '00000000-0000-0000-0000-000000000001', status: 'HADIR' },
        { siswa_id: '00000000-0000-0000-0000-000000000002', status: 'SAKIT', keterangan: 'Demam' }
      ]
    }
  });
  assert(res.ok, 'POST /attendance-api - Bulk input (auth)');
}

// ============================================
// RAPOR API TESTS
// ============================================
async function testRaporAPI() {
  log('\n--- Testing Rapor API ---', 'blue');
  
  // Test get rapor siswa
  let res = await fetchApi('/rapor-api?siswa_id=00000000-0000-0000-0000-000000000001&term_id=00000000-0000-0000-0000-000000000001');
  assert(res.ok, 'GET /rapor-api - Get student report');
  assert(res.data?.data?.siswa, 'GET /rapor-api - Contains siswa data');
  
  // Test get rapor kelas
  res = await fetchApi('/rapor-api/kelas?kelas_id=00000000-0000-0000-0000-000000000001&term_id=00000000-0000-0000-0000-000000000001');
  assert(res.ok, 'GET /rapor-api/kelas - Get class reports');
  assert(Array.isArray(res.data?.data), 'GET /rapor-api/kelas - Returns array');
  
  // Test save catatan (requires auth)
  res = await fetchApi('/rapor-api', {
    method: 'POST',
    auth: true,
    body: {
      term_id: '00000000-0000-0000-0000-000000000001',
      siswa_id: '00000000-0000-0000-0000-000000000001',
      kelas_id: '00000000-0000-0000-0000-000000000001',
      catatan: 'Test catatan'
    }
  });
  assert(res.ok, 'POST /rapor-api - Save catatan (auth)');
}

// ============================================
// AUTH TESTS
// ============================================
async function testAuth() {
  log('\n--- Testing Authentication ---', 'blue');
  
  // Test POST without auth should fail
  let res = await fetchApi('/guru-api', {
    method: 'POST',
    body: { nama: 'Test' }
  });
  assert(res.status === 401, 'POST without auth returns 401');
  
  res = await fetchApi('/siswa-api', {
    method: 'POST',
    body: { nama: 'Test' }
  });
  assert(res.status === 401, 'POST siswa without auth returns 401');
  
  res = await fetchApi('/assessment-api', {
    method: 'POST',
    body: { judul: 'Test' }
  });
  assert(res.status === 401, 'POST assessment without auth returns 401');
  
  res = await fetchApi('/attendance-api', {
    method: 'POST',
    body: { status: 'HADIR' }
  });
  assert(res.status === 401, 'POST attendance without auth returns 401');
  
  res = await fetchApi('/rapor-api', {
    method: 'POST',
    body: { catatan: 'Test' }
  });
  assert(res.status === 401, 'POST rapor without auth returns 401');
}

// ============================================
// RUN ALL TESTS
// ============================================
async function runTests() {
  log('\n==========================================', 'blue');
  log('SIKAD v4.0 Test Suite', 'blue');
  log(`Base URL: ${BASE_URL}`, 'yellow');
  log('==========================================', 'blue');
  
  try {
    await testAuth();
    await testGuruAPI();
    await testSiswaAPI();
    await testMapelAPI();
    await testAcademicAPI();
    await testKelasAPI();
    await testAssessmentAPI();
    await testAttendanceAPI();
    await testRaporAPI();
  } catch (error) {
    log(`\nUnexpected error: ${error.message}`, 'red');
  }
  
  log('\n==========================================', 'blue');
  log('Test Results', 'blue');
  log(`Total: ${total}`, 'yellow');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log('==========================================', 'blue');
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
