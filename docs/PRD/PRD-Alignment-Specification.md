# PRD-Alignment Specification v1.0

> **Version**: 1.0  
> **Date**: June 28, 2026  
> **Status**: ACTIVE  
> **Last Updated**: 2026-06-28

---

## Table of Contents

1. [System Vision](#1-system-vision)
2. [Architecture Overview](#2-architecture-overview)
3. [Module Specifications](#3-module-specifications)
4. [API Specifications](#4-api-specifications)
5. [Database Schema](#5-database-schema)
6. [Security Requirements](#6-security-requirements)
7. [Sync Engine](#7-sync-engine)
8. [Frontend Modules](#8-frontend-modules)
9. [Implementation Checklist](#9-implementation-checklist)
10. [Gap Status](#10-gap-status)

---

## 1. System Vision

### 1.1 Product Overview

**SIKAD v4.0** adalah Sistem Informasi Akademik Madrasah Digital generasi ke-4 yang dirancang untuk mengelola seluruh aspek administrasi akademik sekolah Islam mulai dari jenjang MTs hingga MA. Sistem ini mengadopsi arsitektur hybrid yang menggabungkan kemampuan offline-first dengan sinkronisasi real-time ke cloud.

### 1.2 Design Principles

| Principle | Description | Implementation |
|-----------|-------------|----------------|
| **Offline-First** | Aplikasi harus berfungsi penuh tanpa koneksi internet | IndexedDB via Dexie.js |
| **Real-Time Sync** | Data tersinkronisasi saat koneksi tersedia | Supabase Realtime + custom sync queue |
| **Zero-Trust Security** | Tidak ada asumsi kepercayaan, verifikasi di setiap layer | JWT + RLS + Input Validation |
| **Core Domain Driven** | Academic Term sebagai pusat semua transaksi | Foreign key di semua tabel |
| **Snapshot First** | Setiap perubahan kritis dibuat snapshot sebelum modifikasi | Archive Engine dengan versioning |

### 1.3 Target Users

| Role | Access Level | Primary Use Cases |
|------|--------------|-------------------|
| **ADMIN** | Full System | User management, system config, audit |
| **KURIKULUM** | Academic Data | Assessment, kelas, rapor, promotion |
| **KEPSEK** | Dashboard | Monitoring, reporting, analytics |
| **GURU** | Own Data | Kehadiran, nilai, rapor |
| **WALI KELAS** | Class Data | Catatan wali, rapor kelas |

---

## 2. Architecture Overview

### 2.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SIKAD v4.0 ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────┐
                                    │   BROWSER   │
                                    │  (React.js) │
                                    └──────┬──────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
           ┌────────────────┐    ┌────────────────┐    ┌────────────────┐
           │   Zustand      │    │   IndexedDB    │    │  SyncManager  │
           │   (State)      │    │   (Dexie.js)   │    │  (Offline)     │
           └────────────────┘    └────────────────┘    └────────────────┘
                    │                      │                      │
                    └──────────────────────┼──────────────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
           ┌────────────────┐    ┌────────────────┐    ┌────────────────┐
           │  LocalEncryptor │    │   SyncQueue    │    │ ConflictQueue  │
           │  (AES-GCM 256)  │    │   (Pending)    │    │   (Detected)   │
           └────────────────┘    └────────────────┘    └────────────────┘
                    │                      │                      │
                    └──────────────────────┼──────────────────────┘
                                           │
                                           ▼
                              ┌────────────────────────┐
                              │    SUPABASE EDGE        │
                              │    FUNCTIONS           │
                              │    (Deno Runtime)       │
                              └───────────┬────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
                    ▼                     ▼                     ▼
           ┌────────────────┐    ┌────────────────┐    ┌────────────────┐
           │  PostgreSQL     │    │  Storage       │    │  Realtime      │
           │  (Database)    │    │  (Files)       │    │  (WebSocket)   │
           └────────────────┘    └────────────────┘    └────────────────┘
```

### 2.2 Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────────────────┘

1. WRITE OPERATION (Online)
┌─────────┐    ┌──────────┐    ┌────────────┐    ┌──────────────┐
│  React  │───▶│ Zustand  │───▶│  API Call  │───▶│  Supabase    │
│   UI    │    │  Store   │    │  (REST)    │    │  Edge Func   │
└─────────┘    └──────────┘    └────────────┘    └──────────────┘

2. WRITE OPERATION (Offline)
┌─────────┐    ┌──────────┐    ┌────────────┐    ┌──────────────┐
│  React  │───▶│ Zustand  │───▶│  IndexedDB  │───▶│  SyncQueue   │
│   UI    │    │  Store   │    │  (Dexie)   │    │  (Pending)   │
└─────────┘    └──────────┘    └────────────┘    └──────────────┘
                                                            │
                                              (Retry with exponential backoff)
                                                            ▼
                                                   ┌──────────────┐
                                                   │  Supabase    │
                                                   │  Edge Func   │
                                                   └──────────────┘

3. CONFLICT DETECTION
┌──────────────┐    ┌─────────────┐    ┌──────────────┐    ┌────────────┐
│  SyncQueue   │───▶│  Conflict   │───▶│  Conflict    │───▶│  Conflict  │
│  Processing  │    │  Detector   │    │  Queue       │    │  Resolution│
└──────────────┘    └─────────────┘    └──────────────┘    │  Center UI │
                                                            └────────────┘
```

### 2.3 Module Dependencies

```
                    ┌─────────────────┐
                    │  Academic Term  │  ← CORE DOMAIN (Required for all)
                    │   (semesters)   │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐  ┌─────────────────┐  ┌───────────────────┐
│  Master Data  │  │  Assessment    │  │  Kehadiran        │
│  - Guru       │  │  Engine        │  │  (Attendance)     │
│  - Siswa      │  │  - Nilai       │  │  - Presensi       │
│  - Kelas      │  │  - Jenis Ujian │  │  - Izin/Sakit     │
│  - Mapel      │  │  - Analisis   │  │                   │
└───────────────┘  └─────────────────┘  └───────────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             ▼
                    ┌─────────────────┐
                    │     Rapor       │
                    │   Engine        │
                    │  - Snapshot     │
                    │  - Finalize     │
                    │  - Reopen       │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
  │   Promotion   │  │  Graduation   │  │    Archive   │
  │    Engine     │  │    Engine     │  │    Engine     │
  └───────────────┘  └───────────────┘  └───────────────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             ▼
                    ┌─────────────────┐
                    │     Alumni     │
                    │    Engine      │
                    │  - Snapshot    │
                    │  - Historical  │
                    └─────────────────┘
```

---

## 3. Module Specifications

### 3.1 Core Modules

#### 3.1.1 Academic Term (Core Domain)

**Purpose**: Academic term adalah pusat dari seluruh transaksi akademik. Setiap operasi harus terkait dengan academic term.

**Specification**:
```typescript
interface AcademicTerm {
  id: string;                    // UUID
  name: string;                  // "2025/2026 Ganjil"
  year: number;                  // 2025
  semester: 'ganjil' | 'genap';  // ganjil
  start_date: Date;
  end_date: Date;
  rpe_target: number;           // 112 (for ganjil)
  status: 'draft' | 'active' | 'archived';
  is_locked: boolean;           // Prevent data modification
  created_at: Date;
  updated_at: Date;
}
```

**Rules**:
- Setiap transaksi akademik WAJIB memiliki `academic_term_id`
- Hanya 1 academic term yang boleh aktif dalam satu waktu
- Academic term aktif tidak bisa dihapus
- `is_locked = true` mencegah modifikasi data

#### 3.1.2 Promotion Engine

**Purpose**: Mengelola perpindahan siswa dari satu kelas ke kelas berikutnya.

**Specification**:
```typescript
interface PromotionJob {
  id: string;
  academic_term_id: string;      // Source term
  target_academic_term_id: string; // Target term
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'rolled_back';
  total_students: number;
  promoted_count: number;
  failed_count: number;
  created_by: string;
  created_at: Date;
  completed_at?: Date;
}

interface PromotionDetail {
  id: string;
  promotion_job_id: string;
  siswa_id: string;
  source_kelas_id: string;
  target_kelas_id: string;
  status: 'pending' | 'promoted' | 'failed' | 'rolled_back';
  error_message?: string;
  processed_at?: Date;
}
```

**Features**:
- Batch processing dengan transaction
- Rollback capability jika gagal
- Progress monitoring real-time
- Validation rules (nilai minimum, kehadiran minimum)

#### 3.1.3 Graduation Engine

**Purpose**: Mengelola kelulusan siswa dan konversi ke alumni.

**Specification**:
```typescript
interface GraduationJob {
  id: string;
  academic_term_id: string;
  kelas_id: string;              // Kelas yang akan diluluskan
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_students: number;
  graduated_count: number;
  failed_count: number;
  created_by: string;
  created_at: Date;
}

interface GraduationDetail {
  id: string;
  graduation_job_id: string;
  siswa_id: string;
  final_score: number;
  status: 'graduated' | 'not_graduated' | 'pending';
  alumni_id?: string;            // Created after graduation
  processed_at?: Date;
}
```

**Features**:
- Automatic alumni conversion
- Snapshot before graduation
- Graduation certificate generation
- Academic history preservation

#### 3.1.4 Archive Engine

**Purpose**: Mengarsipkan data akademik yang tidak aktif.

**Specification**:
```typescript
interface ArchiveJob {
  id: string;
  academic_term_id: string;
  target_table: 'academic_terms' | 'kelas' | 'assessments' | 'rapor_snapshots';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  records_archived: number;
  created_at: Date;
}
```

**Modes**:
- **Snapshot Only (Default)**: Data tetap di tabel utama, dibuat snapshot
- **Physical Archive (Future)**: Data dipindahkan ke tabel arsip terpisah

### 3.2 Assessment Engine

#### 3.2.1 Assessment Types Configuration

```typescript
interface AssessmentType {
  id: string;
  code: string;                  // "UH", "PTS", "PAS", etc.
  name: string;                  // "Ulangan Harian"
  category: 'daily' | 'mid_term' | 'final';
  weight: number;                // Percentage weight
  is_active: boolean;
}

// Default configuration (can be modified by KURIKULUM)
const DEFAULT_ASSESSMENT_TYPES: AssessmentType[] = [
  { id: 'uh', code: 'UH', name: 'Ulangan Harian', category: 'daily', weight: 60, is_active: true },
  { id: 'pts', code: 'PTS', name: 'Penilaian Tengah Semester', category: 'mid_term', weight: 20, is_active: true },
  { id: 'pas', code: 'PAS', name: 'Penilaian Akhir Semester', category: 'final', weight: 20, is_active: true },
];
```

**Rule**: Tidak ada hardcode assessment type di source code. Semua melalui konfigurasi database.

#### 3.2.2 Exam Rooming & Invigilation

**Tables** (per PRD Revision 18):

```typescript
// Table: asesmen_ruangs
interface ExamRoom {
  id: string;
  nama_ruang: string;            // "Ruang 01"
  kapasitas: number;              // 30
  semester_id: string;           // FK to semesters.id
  created_at: Date;
}

// Table: asesmen_pesertas
interface ExamParticipant {
  id: string;
  siswa_id: string;              // FK to siswas.id
  ruang_id: string;             // FK to asesmen_ruangs.id
  no_peserta: string;           // Unique
  nomor_meja: number;
  semester_id: string;           // FK to semesters.id
  
  // Constraint: UNIQUE(siswa_id, semester_id)
}

// Table: asesmen_pengawases
interface ExamSupervisor {
  id: string;
  guru_id: string;              // FK to gururs.id
  ruang_id: string;             // FK to asesmen_ruangs.id
  tanggal: Date;
  sesi: string;                 // "Sesi 1", "Sesi 2"
  semester_id: string;           // FK to semesters.id
  
  // Constraint: UNIQUE(guru_id, tanggal, sesi)
}
```

**Features**:
- Bulk allocation (auto-distribute students to rooms)
- Conflict-free scheduling (no double-booking)
- Offline support with encrypted sync
- Print layouts: exam card, desk labels

### 3.3 Sync Engine

#### 3.3.1 Sync Queue Structure

```typescript
interface SyncQueueItem {
  id: string;
  table_name: string;           // "siswas", "assessments", etc.
  operation: 'create' | 'update' | 'delete';
  record_id: string;            // Primary key of the record
  payload: string;              // Encrypted JSON payload (AES-GCM)
  checksum?: string;            // SHA-256 hash for integrity
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retry_count: number;
  max_retries: number;          // Default: 3
  created_at: Date;
  last_retry_at?: Date;
  error_message?: string;
}
```

**Sync Process**:
1. Operation triggers → Add to sync_queue
2. If online → Process immediately
3. If offline → Queue with pending status
4. On reconnect → Process queue with exponential backoff
5. On conflict → Add to conflict_queue

#### 3.3.2 Conflict Queue Structure

```typescript
interface ConflictQueueItem {
  id: string;
  table_name: string;
  record_id: string;
  local_version: object;        // Version from IndexedDB
  server_version: object;       // Version from Supabase
  conflict_type: 'update_update' | 'delete_update' | 'update_delete';
  detected_at: Date;
  resolved: boolean;
  resolved_by?: string;
  resolution?: 'local' | 'server' | 'manual';
  resolved_at?: Date;
}
```

**Critical Tables** (No Auto-Resolve):
- `rapor_snapshots` - Must use manual resolution
- `graduation_jobs` - Must use manual resolution
- `promotion_jobs` - Must use manual resolution

---

## 4. API Specifications

### 4.1 API Architecture

All APIs are implemented as Supabase Edge Functions (Deno runtime).

**Base URL**: `https://[project].supabase.co/functions/v1/[api-name]`

**Authentication**: Bearer token (JWT) in Authorization header

### 4.2 API List

| API | Method | Endpoint | Description | Status |
|-----|--------|----------|-------------|--------|
| guru-api | * | /guru | CRUD operations for teachers | ✅ Active |
| siswa-api | * | /siswa | CRUD operations for students | ✅ Active |
| kelas-api | * | /kelas | CRUD operations for classes | ✅ Active |
| mapel-api | * | /mapel | CRUD operations for subjects | ✅ Active |
| academic-api | * | /academic | Academic term operations | ✅ Active |
| assessment-api | * | /assessment | Assessment operations | ✅ Active |
| rapor-api | * | /rapor | Report card operations | ✅ Active |
| promotion-api | * | /promotion | Promotion engine operations | ✅ Active |
| graduation-api | * | /graduation | Graduation engine operations | ✅ Active |
| archive-api | * | /archive | Archive engine operations | ✅ Active |
| dashboard-api | * | /dashboard | Dashboard aggregations | ✅ Active |
| export-api | * | /export | Export functionality | ✅ Active |
| monitoring-api | * | /monitoring | System monitoring | ✅ Active |
| custom-login | POST | /login | Custom authentication | ✅ Active |

### 4.3 API Security Requirements

All APIs MUST implement:

| Security Feature | Implementation | Location |
|-----------------|---------------|----------|
| Zod Validation | Input schema validation | `src/utils/validation.ts` |
| Rate Limiting | Per-endpoint configuration | Edge Function config |
| JWT Authentication | Verify Bearer token | All protected endpoints |
| SQL Injection Prevention | Parameterized queries only | All queries |
| XSS Protection | Input sanitization | Output encoding |
| CSRF Protection | JWT-based mitigation | All mutating endpoints |
| Error Handling | Generic to client, detailed logs | All error handlers |

### 4.4 API Response Format

```typescript
// Success Response
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

// Error Response
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;               // "VALIDATION_ERROR", "UNAUTHORIZED", etc.
    message: string;            // Human-readable message
    details?: any;             // Additional error details
  };
}
```

---

## 5. Database Schema

### 5.1 Core Tables

#### Academic Term Tables
```sql
-- semesters (Academic Terms)
CREATE TABLE semesters (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL,
  semester VARCHAR(10) NOT NULL CHECK (semester IN ('ganjil', 'genap')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rpe_target INTEGER DEFAULT 112,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Master Data Tables
```sql
-- gurus (Teachers)
CREATE TABLE gurus (
  id VARCHAR(50) PRIMARY KEY,  -- Same as auth.users.id (Revision 3)
  nip VARCHAR(20) UNIQUE NOT NULL,
  nama VARCHAR(100) NOT NULL,
  jenis_kelamin VARCHAR(10),
  email VARCHAR(100),
  no_hp VARCHAR(20),
  alamat TEXT,
  status VARCHAR(20) DEFAULT 'aktif',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- siswas (Students)
CREATE TABLE siswas (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nis VARCHAR(20) UNIQUE NOT NULL,
  nisn VARCHAR(20) UNIQUE,
  nama VARCHAR(100) NOT NULL,
  jenis_kelamin VARCHAR(10),
  tempat_lahir VARCHAR(50),
  tanggal_lahir DATE,
  alamat TEXT,
  nama_ortu VARCHAR(100),
  no_hp_ortu VARCHAR(20),
  kelas_id VARCHAR(50),
  status VARCHAR(20) DEFAULT 'aktif',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- kelas (Classes)
CREATE TABLE kelas (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nama VARCHAR(50) NOT NULL,
  tingkat VARCHAR(10) NOT NULL,  -- "X", "XI", "XII"
  jurusan VARCHAR(50),            -- "IPA", "IPS", NULL for MTs
  semester_id VARCHAR(50) NOT NULL REFERENCES semesters(id),
  wali_kelas_id VARCHAR(50) REFERENCES gurus(id),
  status VARCHAR(20) DEFAULT 'aktif',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Assessment Tables
```sql
-- assessment_types (Configurable)
CREATE TABLE assessment_types (
  id VARCHAR(50) PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('daily', 'mid_term', 'final')),
  weight INTEGER NOT NULL CHECK (weight >= 0 AND weight <= 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- assessments
CREATE TABLE assessments (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  semester_id VARCHAR(50) NOT NULL REFERENCES semesters(id),
  mapel_id VARCHAR(50) NOT NULL,
  guru_id VARCHAR(50) NOT NULL,
  kelas_id VARCHAR(50) NOT NULL,
  assessment_type_id VARCHAR(50) NOT NULL REFERENCES assessment_types(id),
  judul VARCHAR(200) NOT NULL,
  tanggal DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- assessment_nilai
CREATE TABLE assessment_nilai (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  assessment_id VARCHAR(50) NOT NULL REFERENCES assessments(id),
  siswa_id VARCHAR(50) NOT NULL REFERENCES siswas(id),
  nilai DECIMAL(5,2) NOT NULL CHECK (nilai >= 0 AND nilai <= 100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assessment_id, siswa_id)
);
```

### 5.2 Exam Rooming Tables (Revision 18)

```sql
-- asesmen_ruangs (Exam Rooms)
CREATE TABLE asesmen_ruangs (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nama_ruang VARCHAR(100) NOT NULL,
  kapasitas INTEGER NOT NULL CHECK (kapasitas > 0),
  semester_id VARCHAR(50) NOT NULL REFERENCES semesters(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- asesmen_pesertas (Exam Participants)
CREATE TABLE asesmen_pesertas (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  siswa_id VARCHAR(50) NOT NULL REFERENCES siswas(id),
  ruang_id VARCHAR(50) NOT NULL REFERENCES asesmen_ruangs(id),
  no_peserta VARCHAR(50) UNIQUE NOT NULL,
  nomor_meja INTEGER NOT NULL,
  semester_id VARCHAR(50) NOT NULL REFERENCES semesters(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_siswa_asesmen_semester UNIQUE(siswa_id, semester_id)
);

-- asesmen_pengawases (Exam Supervisors)
CREATE TABLE asesmen_pengawases (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  guru_id VARCHAR(50) NOT NULL REFERENCES gurus(id),
  ruang_id VARCHAR(50) NOT NULL REFERENCES asesmen_ruangs(id),
  tanggal DATE NOT NULL,
  sesi VARCHAR(50) NOT NULL,
  semester_id VARCHAR(50) NOT NULL REFERENCES semesters(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_guru_ruang_tanggal_sesi UNIQUE(guru_id, tanggal, sesi)
);
```

### 5.3 Sync & Audit Tables

```sql
-- sync_logs
CREATE TABLE sync_logs (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  table_name VARCHAR(50) NOT NULL,
  operation VARCHAR(20) NOT NULL,
  record_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50),
  client_timestamp TIMESTAMPTZ,
  server_timestamp TIMESTAMPTZ DEFAULT now(),
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT
);

-- audit_logs
CREATE TABLE audit_logs (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  table_name VARCHAR(50) NOT NULL,
  record_id VARCHAR(50) NOT NULL,
  action VARCHAR(20) NOT NULL,
  old_data JSONB,
  new_data JSONB,
  user_id VARCHAR(50) NOT NULL,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- export_logs (NEW - Required for GAP-011)
CREATE TABLE export_logs (
  id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(50) NOT NULL,
  export_type VARCHAR(50) NOT NULL,  -- "rapor", "nilai", "kehadiran"
  format VARCHAR(20) NOT NULL,       -- "pdf", "excel", "csv"
  record_count INTEGER NOT NULL,
  parameters JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 6. Security Requirements

### 6.1 Authentication & Authorization

| Requirement | Implementation |
|-------------|----------------|
| User Authentication | Supabase Auth with custom login function |
| Role-Based Access | RBAC tables with role inheritance |
| Session Management | JWT with 24-hour expiry |
| Device Trust | Device health tracking |

### 6.2 Row Level Security (RLS)

All tables MUST have RLS enabled with policies:

```sql
-- Example: Guru can only see own data
CREATE POLICY guru_own_data ON gurus
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Example: Guru can only update own profile
CREATE POLICY guru_update_own ON gurus
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
```

### 6.3 Input Validation (Zod)

All API inputs MUST be validated with Zod schemas:

```typescript
// Example: Siswa creation schema
const createSiswaSchema = z.object({
  nis: z.string().min(1).max(20),
  nisn: z.string().max(20).optional(),
  nama: z.string().min(1).max(100),
  jenis_kelamin: z.enum(['L', 'P']),
  tempat_lahir: z.string().max(50).optional(),
  tanggal_lahir: z.string().datetime().optional(),
  alamat: z.string().optional(),
  nama_ortu: z.string().max(100).optional(),
  no_hp_ortu: z.string().max(20).optional(),
  kelas_id: z.string().uuid(),
});
```

### 6.4 Rate Limiting

| Endpoint Type | Limit |
|--------------|-------|
| Read endpoints | 100 requests/minute |
| Write endpoints | 30 requests/minute |
| Auth endpoints | 10 requests/minute |
| Export endpoints | 5 requests/minute |

---

## 7. Sync Engine

### 7.1 Offline Capabilities

| Feature | Status | Implementation |
|---------|--------|----------------|
| Local Data Storage | ✅ | Dexie.js (IndexedDB) |
| Offline Detection | ✅ | navigator.onLine + online/offline events |
| Queue Management | ✅ | SyncManager.processQueue() |
| Conflict Detection | ✅ | Version comparison + timestamp |
| Encrypted Storage | ⚠️ Partial | LocalEncryptor exists but not used in sync |
| Checksum Validation | ❌ Missing | Not implemented |

### 7.2 Sync Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     SYNC FLOW DIAGRAM                        │
└─────────────────────────────────────────────────────────────┘

[User Action]
    │
    ▼
[Write to IndexedDB + Add to SyncQueue]
    │
    ├─── Online ───▶ [Process Immediately]
    │                      │
    │                      ▼
    │               [Call Supabase API]
    │                      │
    │         ┌────────────┴────────────┐
    │         │                         │
    │         ▼                         ▼
    │    [Success]                  [Conflict]
    │         │                         │
    │         ▼                         ▼
    │    [Update local]         [Add to ConflictQueue]
    │                                              │
    └─── Offline ──▶ [Queue for later]             ▼
                         │              [Show Conflict UI]
                         │
                         ▼
                  [Wait for online]
                         │
                         ▼
                  [Process queue with exponential backoff]
```

### 7.3 Retry Strategy

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,       // 1 second
  maxDelay: 60000,       // 1 minute
  jitter: true,          // Add randomness
};

// Exponential backoff formula: min(baseDelay * 2^attempt, maxDelay) + random(0-1000)
```

---

## 8. Frontend Modules

### 8.1 Module Structure

```
src/modules/
├── auth/                    # Authentication
│   ├── pages/
│   │   └── LoginPage.tsx
│   ├── components/
│   └── services/
│
├── academic-term/          # Academic Term (Core Domain)
│   ├── pages/
│   │   └── AcademicTermPage.tsx
│   └── services/
│
├── guru/                   # Teacher Management
│   ├── pages/
│   │   └── GuruPage.tsx
│   ├── services/
│   │   └── guruService.ts
│   └── components/
│
├── siswa/                  # Student Management
│   ├── pages/
│   │   ├── SiswaPage.tsx
│   │   └── MutasiSiswaPage.tsx
│   └── services/
│
├── kelas/                  # Class Management
│   ├── pages/
│   │   ├── KelasPage.tsx
│   │   ├── PembagianMengajarPage.tsx
│   │   ├── PromotionPage.tsx
│   │   └── GraduationPage.tsx
│   └── services/
│
├── assessment/            # Assessment Engine
│   ├── pages/
│   │   ├── JadwalUjianPage.tsx
│   │   ├── PembagianRuangPage.tsx
│   │   └── SupervisorSchedulePage.tsx
│   ├── components/
│   ├── services/
│   └── types/
│
├── rapor/                 # Report Card
│   ├── pages/
│   │   └── RaporPage.tsx
│   └── services/
│
├── calendar/              # Academic Calendar
│   ├── pages/
│   │   └── CalendarPage.tsx
│   └── services/
│
├── conflict/              # Conflict Resolution (MISSING - GAP-004)
│   ├── pages/
│   │   └── ConflictCenterPage.tsx
│   ├── components/
│   └── services/
│
├── tugas-tambahan/        # Additional Duties (MISSING - GAP-002)
│   ├── pages/
│   │   └── TugasTambahanPage.tsx
│   ├── components/
│   └── services/
│
├── kehadiran/            # Attendance (MISSING - GAP-003)
│   ├── pages/
│   │   └── KehadiranPage.tsx
│   ├── components/
│   └── services/
│
├── dashboard-kurikulum/   # Kurikulum Dashboard
│   └── pages/
│
├── dashboard-kepsek/      # Kepala Sekolah Dashboard
│   └── pages/
│
├── reporting/            # Reporting & Analytics
│   └── pages/
│
└── settings/             # Settings
    ├── pages/
    │   ├── SettingsPage.tsx
    │   ├── MonitoringCenterPage.tsx
    │   └── ArchivePage.tsx
    └── services/
```

### 8.2 Required Pages by Module

| Module | Required Pages | Status |
|--------|---------------|--------|
| auth | LoginPage | ✅ Complete |
| academic-term | AcademicTermPage, CalendarPage | ✅ Complete |
| guru | GuruPage | ✅ Complete |
| siswa | SiswaPage, MutasiSiswaPage | ✅ Complete |
| kelas | KelasPage, PembagianMengajarPage, PromotionPage, GraduationPage | ⚠️ Partial |
| assessment | JadwalUjianPage, PembagianRuangPage, SupervisorSchedulePage, ExamPrintPage | ⚠️ Partial |
| rapor | RaporPage | ✅ Complete |
| conflict | ConflictCenterPage | ❌ MISSING |
| tugas-tambahan | TugasTambahanPage | ❌ MISSING |
| kehadiran | KehadiranPage | ❌ MISSING |
| dashboard-kurikulum | DashboardPage | ✅ Complete |
| dashboard-kepsek | DashboardPage | ✅ Complete |
| reporting | ReportingPage | ⚠️ Partial |
| settings | SettingsPage, MonitoringCenterPage, ArchivePage | ⚠️ Partial |

---

## 9. Implementation Checklist

### 9.1 Critical (Must Complete Before Go-Live)

- [ ] **GAP-009**: Implement sync queue encryption
  - [ ] Integrate LocalEncryptor into SyncManager
  - [ ] Encrypt payload before storing in IndexedDB
  - [ ] Decrypt payload before syncing
  - [ ] Add encrypted flag to SyncQueueItem

- [ ] **GAP-004**: Create Conflict Resolution UI
  - [ ] Create `src/modules/conflict/` directory
  - [ ] Create ConflictCenterPage.tsx
  - [ ] Implement conflict list view
  - [ ] Implement manual resolution modal
  - [ ] Add role-based access (ADMIN, KURIKULUM)

- [ ] **GAP-011**: Add export logging
  - [ ] Create `XXXX_export_logs.sql` migration
  - [ ] Add logging to export-api Edge Function
  - [ ] Track user, timestamp, export type, record count

### 9.2 High Priority (Next Sprint)

- [ ] **GAP-002**: Create tugas-tambahan module
  - [ ] Create directory structure
  - [ ] Create TugasTambahanPage.tsx
  - [ ] Implement CRUD operations
  - [ ] Add service layer

- [ ] **GAP-003**: Create kehadiran module
  - [ ] Create directory structure
  - [ ] Create KehadiranPage.tsx
  - [ ] Implement attendance tracking
  - [ ] Add service layer

- [ ] **GAP-010**: Add sync queue checksum
  - [ ] Add checksum field to SyncQueueItem
  - [ ] Implement SHA-256 hash computation
  - [ ] Verify checksum on sync

- [ ] **GAP-006**: Enhance Monitoring Center
  - [ ] Add real-time sync health indicators
  - [ ] Add database health metrics
  - [ ] Add alert center

### 9.3 Medium Priority (Nice to Have)

- [ ] **GAP-005**: Enhance Reporting Module
- [ ] **GAP-007**: Standardize trusted_devices naming
- [ ] **GAP-008**: Standardize exam rooming table naming
- [ ] **GAP-012**: Add auto-resolve prevention for critical tables
- [ ] **GAP-015**: Document Data Retention Policy

---

## 10. Gap Status

### 10.1 Gap Summary

| Gap ID | Priority | Description | Status | Files |
|--------|----------|-------------|--------|-------|
| GAP-001 | Low | attendance-api deprecated | Documented | N/A |
| GAP-002 | HIGH | tugas-tambahan Module | TODO | Create new module |
| GAP-003 | HIGH | kehadiran Module | TODO | Create new module |
| GAP-004 | CRITICAL | Conflict Center UI | TODO | Create new module |
| GAP-005 | MEDIUM | Reporting Module | TODO | Enhance existing |
| GAP-006 | HIGH | Monitoring Center | TODO | Enhance existing |
| GAP-007 | Low | trusted_devices naming | TODO | Rename or document |
| GAP-008 | Low | exam rooming naming | TODO | Standardize |
| GAP-009 | CRITICAL | Sync Queue Encryption | TODO | Modify SyncManager |
| GAP-010 | HIGH | Sync Checksum | TODO | Modify schema |
| GAP-011 | CRITICAL | Export Logging | TODO | Create migration |
| GAP-012 | MEDIUM | Auto-resolve prevention | TODO | Modify SyncManager |
| GAP-015 | MEDIUM | Data Retention Policy | TODO | Create document |

### 10.2 PRD Revision Status

| Revision | Title | Implementation Status |
|----------|-------|----------------------|
| 1 | Academic Term Core Domain | ✅ Complete |
| 2 | Configurable Assessment Engine | ✅ Complete |
| 3 | Guru Identity Unification | ✅ Complete |
| 4 | Kelas Bayangan Deleted | ✅ Complete |
| 5 | Alumni Hybrid Architecture | ✅ Complete |
| 6 | Snapshot First Strategy | ✅ Complete |
| 7 | Promotion Engine | ✅ Complete |
| 8 | Graduation Engine | ✅ Complete |
| 9 | Sync Engine Formalization | ⚠️ Partial (GAP-009, GAP-010) |
| 10 | Conflict Resolution Center | ❌ Partial (GAP-004) |
| 11 | Monitoring Center | ⚠️ Partial (GAP-006) |
| 12 | Archive Engine | ✅ Complete |
| 13 | Rapor Versioning | ✅ Complete |
| 14 | Device Management | ⚠️ Partial (GAP-007) |
| 15 | Data Retention Policy | ❌ Not documented (GAP-015) |
| 16 | New Go Live Requirements | ✅ Mostly Complete |
| 17 | New Production Architecture | ✅ Complete |
| 18 | Exam Rooming & Invigilation | ⚠️ Partial (GAP-008) |

---

## Appendix A: Visi AI Agent

### A.1 Design Philosophy

Ketika AI agent membaca codebase ini, mereka harus memahami:

1. **Offline-First Architecture**: Aplikasi ini dirancang untuk bekerja tanpa koneksi internet. Data disimpan di IndexedDB dan disinkronkan saat online.

2. **Core Domain Driven**: Academic Term adalah pusat dari seluruh transaksi. Setiap operasi akademik harus terkait dengan academic term.

3. **Security First**: Setiap layer memiliki keamanan. Tidak ada asumsi kepercayaan.

4. **Conflict Aware**: Konflik sinkronisasi harus ditangani dengan bijak, terutama untuk data kritis.

5. **Snapshot Before Change**: Data kritis harus di-snapshot sebelum dimodifikasi.

### A.2 Common Patterns

**Write Operation Pattern**:
```typescript
// 1. Write to local store
// 2. Add to sync queue
// 3. If online, process immediately
// 4. If offline, queue for later
// 5. On conflict, add to conflict queue
// 6. User resolves conflict via Conflict Center
```

**API Call Pattern**:
```typescript
// 1. Validate input with Zod schema
// 2. Check rate limit
// 3. Verify JWT token
// 4. Execute database operation with RLS
// 5. Log to audit_logs
// 6. Return standardized response
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-06-28  
**Author**: AETHER Platform PRD Audit  
**Next Review**: Before v4.0 Go-Live
