# 04-API-Specification.md

# API SPECIFICATION

## SIKAD v4.0

Version: 4.0.1

Status: APPROVED - SECURITY HARDENED

**Last Updated:** 28 June 2026 - Complete Security Hardening + PRD Gap Analysis

**Version History:**
- v4.0.1 (2026-06-28): Added PRD Gap Analysis, updated implementation status
- v4.0 (2026-06-26): Complete Security Hardening on all 8 APIs

**Changes from Previous Version:**
- Added security hardening for all 8 core APIs
- Added Zod input validation
- Added rate limiting rules
- Enhanced JWT authentication
- Fixed N+1 queries in rapor-api
- Added CSRF protection
- Added PRD Gap Analysis (GAP-001 to GAP-012)

---

# TUJUAN

Dokumen ini mendefinisikan standar API seluruh modul SIKAD v4.0.

---

# API ARCHITECTURE

## Supabase Edge Functions

```text
React 19
↓
TanStack Query
↓
Service Layer
↓
Supabase Edge Functions
↓
PostgreSQL + RLS
```

**Edge Functions Base URL:**

```text
https://[project].supabase.co/functions/v1/
```

---

# API PRINCIPLES

## Principle 1

Frontend tidak boleh mengakses database secara langsung.

Semua akses harus melalui:

```text
Service Layer
↓
Supabase Edge Functions
↓
PostgreSQL + RLS
```

---

## Principle 2

Semua Edge Function endpoint mengembalikan format standar:

```typescript
{
  data: any;      // Success response
  error?: string;  // Error message
}
```

---

## Principle 3

Pagination wajib untuk list endpoints.

---

## Principle 4

Rate limiting diterapkan pada semua endpoints.

---

# STANDARD RESPONSE

## Success

```json
{
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "total_pages": 5
    }
  }
}
```

---

## Error

```json
{
  "error": "Error message here"
}
```

---

# AUTHENTICATION

**Base:** `/auth/v1/`

## Login

```http
POST /auth/v1/token?grant_type=password
```

---

# GURU API

**Edge Function:** `/functions/v1/guru-api`

Base: `/functions/v1/guru-api`

## List Guru

```http
GET /functions/v1/guru-api
```

---

## Detail Guru

```http
GET /functions/v1/guru-api?id={uuid}
```

---

# SISWA API

**Edge Function:** `/functions/v1/siswa-api`

Base: `/functions/v1/siswa-api`

## List

```http
GET /functions/v1/siswa-api
```

---

## Detail

```http
GET /functions/v1/siswa-api?id={uuid}
```

---

# KELAS API

**Edge Function:** `/functions/v1/kelas-api`

Base: `/functions/v1/kelas-api`

## List

```http
GET /functions/v1/kelas-api
```

Query: `?academic_term_id={uuid}&tingkat=10&jenis=REGULER`

---

## Detail

```http
GET /functions/v1/kelas-api?id={uuid}
```

---

# MAPEL API

**Edge Function:** `/functions/v1/mapel-api`

Base: `/functions/v1/mapel-api`

## List

```http
GET /functions/v1/mapel-api
```

---

# ACADEMIC TERM API

**Edge Function:** `/functions/v1/academic-api`

Base: `/functions/v1/academic-api`

## List

```http
GET /functions/v1/academic-api
```

---

## Active Term

```http
GET /functions/v1/academic-api?status=AKTIF
```

---

# ASSESSMENT API

**Edge Function:** `/functions/v1/assessment-api`

Base: `/functions/v1/assessment-api`

## List

```http
GET /functions/v1/assessment-api
```

Query: `?pembagian_mengajar_id={uuid}&stage=PUBLISHED`

---

## Detail

```http
GET /functions/v1/assessment-api?id={uuid}
```

---

## Create

```http
POST /functions/v1/assessment-api
```

Auth: Required

---

## Bulk Save Nilai

```http
POST /functions/v1/assessment-api/bulk-nilai
```

Auth: Required

---

# ATTENDANCE API

**Edge Function:** `/functions/v1/attendance-api`

Base: `/functions/v1/attendance-api`

## List

```http
GET /functions/v1/attendance-api
```

Query: `?siswa_id={uuid}&academic_term_id={uuid}`

---

## Create/Update

```http
POST /functions/v1/attendance-api
```

Auth: Required

---

## Bulk Attendance

```http
POST /functions/v1/attendance-api/bulk
```

Auth: Required

---

# RAPOR API

**Edge Function:** `/functions/v1/rapor-api`

Base: `/functions/v1/rapor-api`

## Get Rapor Siswa

```http
GET /functions/v1/rapor-api
```

Query: `?siswa_id={uuid}&term_id={uuid}`

---

## Get Rapor Kelas

```http
GET /functions/v1/rapor-api/kelas
```

Query: `?kelas_id={uuid}&term_id={uuid}`

---

## Save Catatan Wali Kelas

```http
POST /functions/v1/rapor-api
```

Auth: Required

Body:

```json
{
  "term_id": "uuid",
  "siswa_id": "uuid",
  "kelas_id": "uuid",
  "catatan": "string"
}
```

---

# PROMOTION API

**Edge Function:** `/functions/v1/promotion-api`

Base: `/functions/v1/promotion-api`

## List All Jobs

```http
GET /functions/v1/promotion-api
```

---

## Preview Promotion

```http
POST /functions/v1/promotion-api/preview
```

Body:

```json
{
  "source_term_id": "uuid",
  "target_term_id": "uuid"
}
```

---

## Execute Promotion

```http
POST /functions/v1/promotion-api?action=execute
```

Auth: Required

Body:

```json
{
  "source_term_id": "uuid",
  "target_term_id": "uuid"
}
```

---

## Get Job Details

```http
GET /functions/v1/promotion-api/{job_id}
```

---

## Rollback Promotion

```http
POST /functions/v1/promotion-api/{job_id}/rollback
```

Auth: Required

---

# GRADUATION API

**Edge Function:** `/functions/v1/graduation-api`

Base: `/functions/v1/graduation-api`

## List Graduation Jobs

```http
GET /functions/v1/graduation-api
```

---

## Preview Graduation

```http
POST /functions/v1/graduation-api/preview
```

Body:

```json
{
  "academic_term_id": "uuid"
}
```

---

## Execute Graduation

```http
POST /functions/v1/graduation-api?action=execute
```

Auth: Required

Body:

```json
{
  "academic_term_id": "uuid",
  "tahun_lulus": 2026
}
```

---

## Get Job Details

```http
GET /functions/v1/graduation-api/{job_id}
```

---

## Get Alumni List

```http
GET /functions/v1/graduation-api/alumni
```

Query: `?page=1&limit=20&tahun_lulus=2026`

---

## Get Alumni Statistics

```http
GET /functions/v1/graduation-api/alumni/stats
```

---

# DASHBOARD API

**Edge Function:** `/functions/v1/dashboard-api`

Base: `/functions/v1/dashboard-api`

## Kepala Sekolah Dashboard

```http
GET /functions/v1/dashboard-api?type=kepsek
```

---

## Kurikulum Dashboard

```http
GET /functions/v1/dashboard-api?type=kurikulum
```

Query: `?term_id={uuid}`

---

## Teacher Workload

```http
GET /functions/v1/dashboard-api/workload
```

Query: `?page=1&limit=20&sort_by=jp_total&sort_order=desc`

---

## Analytics Summary

```http
GET /functions/v1/dashboard-api/analytics
```

---

# MONITORING API

**Edge Function:** `/functions/v1/monitoring-api`

Base: `/functions/v1/monitoring-api`

## System Health

```http
GET /functions/v1/monitoring-api/health
```

---

## Sync Queue Status

```http
GET /functions/v1/monitoring-api/sync
```

Query: `?page=1&limit=20&status=PENDING`

---

## Retry Failed Sync

```http
POST /functions/v1/monitoring-api/sync/retry
```

Auth: Required

---

## Conflict Queue

```http
GET /functions/v1/monitoring-api/conflicts
```

Query: `?page=1&limit=20&resolved=false`

---

## Resolve Conflict

```http
POST /functions/v1/monitoring-api/conflicts/{id}/resolve
```

Auth: Required

Body:

```json
{
  "resolution": "local" | "cloud" | "merge"
}
```

---

## Device Health List

```http
GET /functions/v1/monitoring-api/devices
```

Query: `?page=1&limit=20&status=HEALTHY`

---

## Update Device Health

```http
POST /functions/v1/monitoring-api/devices
```

Auth: Required

Body:

```json
{
  "device_id": "string",
  "app_version": "string",
  "status": "HEALTHY"
}
```

---

## Sync Logs

```http
GET /functions/v1/monitoring-api/logs
```

Query: `?page=1&limit=50&table_name=siswas`

---

# ARCHIVE API

**Edge Function:** `/functions/v1/archive-api`

Base: `/functions/v1/archive-api`

## List Archive Jobs

```http
GET /functions/v1/archive-api
```

---

## Preview Archive

```http
POST /functions/v1/archive-api/preview
```

Body:

```json
{
  "academic_term_id": "uuid"
}
```

---

## Create Archive Job

```http
POST /functions/v1/archive-api
```

Auth: Required

Body:

```json
{
  "academic_term_id": "uuid"
}
```

---

## Execute Archive

```http
POST /functions/v1/archive-api/{job_id}/execute
```

Auth: Required

---

## Get Archive Job Details

```http
GET /functions/v1/archive-api/{job_id}
```

---

## Restore from Archive

```http
POST /functions/v1/archive-api/{job_id}/restore
```

Auth: Required

Body:

```json
{
  "tables": ["assessments", "kehadiran"]
}
```

---

## Get Academic Snapshots

```http
GET /functions/v1/archive-api/snapshots
```

Query: `?term_id={uuid}&type=assessments_archive`

---

# EXPORT API

**Edge Function:** `/functions/v1/export-api`

Base: `/functions/v1/export-api`

## Generate Rapor PDF (HTML)

```http
POST /functions/v1/export-api/pdf/rapor
```

Auth: Required

Body:

```json
{
  "siswa_id": "uuid",
  "term_id": "uuid",
  "include_watermark": false
}
```

---

## Export Siswa to CSV

```http
POST /functions/v1/export-api/excel/siswa
```

Auth: Required

Query: `?kelas_id={uuid}&term_id={uuid}&status=AKTIF`

---

## Export Guru to CSV

```http
POST /functions/v1/export-api/excel/guru
```

Auth: Required

---

## Bulk Rapor Export

```http
POST /functions/v1/export-api/zip/bulk
```

Auth: Required

Body:

```json
{
  "kelas_id": "uuid",
  "term_id": "uuid"
}
```

---

## Add Watermark

```http
POST /functions/v1/export-api/watermark
```

Body:

```json
{
  "content": "html_string",
  "watermark_text": "DRAFT"
}
```

---

# SECURITY HARDENING (June 2026)

## Implemented Security Features

| Feature | Status | Implementation |
|---------|--------|----------------|
| Input Validation | ✅ Active | Zod schema validation on all endpoints |
| Rate Limiting | ✅ Active | Per-endpoint rate limiting |
| JWT Authentication | ✅ Active | Mandatory JWT validation on all protected endpoints |
| CSRF Protection | ✅ Active | JWT-based CSRF mitigation |
| SQL Injection Prevention | ✅ Active | Parameterized queries only |
| XSS Protection | ✅ Active | Input sanitization |
| Error Handling | ✅ Active | Generic messages to client, detailed logs server-side |

## APIs Enhanced with Security Hardening

| API | Status | Lines Changed | Key Features |
|-----|--------|---------------|--------------|
| siswa-api | ✅ Hardened | +202 | JWT, Zod, Rate Limit |
| guru-api | ✅ Hardened | +207 | JWT, Zod, Rate Limit |
| kelas-api | ✅ Hardened | +187 | JWT, Zod, Rate Limit |
| mapel-api | ✅ Hardened | +197 | JWT, Zod, Rate Limit |
| academic-api | ✅ Hardened | +157 | JWT, Zod, Rate Limit |
| assessment-api | ✅ Hardened | +199 | JWT, Zod, Rate Limit |
| rapor-api | ✅ Hardened | +222 | JWT, Zod, N+1 Fixed |
| attendance-api | ⚠️ Removed | -289 | Deprecated, consolidated |

## Rate Limit Configuration

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Login | 5 requests | 15 minutes |
| CRUD Operations | 100 requests | 1 minute |
| Export/Archive | 20 requests | 1 hour |

---

# RATE LIMIT

## Standard User

```text
100 requests/minute
```

---

## Export/Archive Operations

```text
20-50 requests/minute
```

---

# SECURITY HEADERS

Semua response Edge Functions dilengkapi:

```text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

# ERROR CODES

```text
AUTH_REQUIRED - Authorization header missing
INVALID_TOKEN - JWT token invalid
DATA_NOT_FOUND - Resource not found
VALIDATION_ERROR - Invalid input
DUPLICATE_DATA - Duplicate entry
RATE_LIMIT_EXCEEDED - Too many requests
INTERNAL_SERVER_ERROR - Server error
```

---

# PRD GAP ANALYSIS

## API Compliance Summary

Based on the PRD vs Implementation Gap Analysis (docs/CHANGELOG/PRD-Alignment-Report.md):

### API Gap Summary

| Gap ID | API | Issue | Impact | Resolution |
|--------|-----|-------|--------|------------|
| GAP-001 | attendance-api | Deprecated/Consolidated | Low | Document architectural decision |

### Critical Security Gaps

| Gap ID | Security Feature | Impact | Required Action |
|--------|-----------------|--------|-----------------|
| GAP-009 | Sync Queue Encryption | CRITICAL | Integrate LocalEncryptor into SyncManager |
| GAP-011 | Export Logging | CRITICAL | Create export_logs table and API tracking |

### PRD Revision Compliance

| Revision | API Area | Status |
|----------|----------|--------|
| 16 | All APIs | ✅ Security hardening complete |
| 17 | Production Architecture | ✅ Implemented |
| 18 | Exam Rooming APIs | ⚠️ Naming mismatch (GAP-008) |

---

# ACCEPTANCE CRITERIA

✓ RESTful Structure

✓ Edge Functions Architecture

✓ Pagination Support

✓ Filtering Support

✓ Bulk Operations

✓ RLS Compatible

✓ Rate Limiting

✓ Security Headers

✓ UUID Validation

✓ JWT Authentication

✓ Standard Response Format

---

# IMPLEMENTATION STATUS

## Completed Edge Functions (13)

| #   | Edge Function  | Status           | Security | File                              |
| --- | -------------- | ---------------- | -------- | --------------------------------- |
| 1   | guru-api       | ✅ Complete      | ✅       | supabase/functions/guru-api       |
| 2   | siswa-api      | ✅ Complete      | ✅       | supabase/functions/siswa-api      |
| 3   | kelas-api      | ✅ Complete      | ✅       | supabase/functions/kelas-api      |
| 4   | mapel-api      | ✅ Complete      | ✅       | supabase/functions/mapel-api      |
| 5   | academic-api   | ✅ Complete      | ✅       | supabase/functions/academic-api   |
| 6   | assessment-api | ✅ Complete      | ✅       | supabase/functions/assessment-api |
| 7   | rapor-api      | ✅ Fixed         | ✅       | supabase/functions/rapor-api      |
| 8   | promotion-api  | ✅ New           | ✅       | supabase/functions/promotion-api  |
| 9   | graduation-api | ✅ New           | ✅       | supabase/functions/graduation-api |
| 10  | dashboard-api  | ✅ New           | ✅       | supabase/functions/dashboard-api  |
| 11  | monitoring-api | ✅ New           | ✅       | supabase/functions/monitoring-api |
| 12  | archive-api    | ✅ New           | ✅       | supabase/functions/archive-api    |
| 13  | export-api     | ✅ New           | ✅       | supabase/functions/export-api     |
| 14  | custom-login   | ✅ New           | ✅       | supabase/functions/custom-login   |

### Legacy/Deprecated

| #   | Edge Function  | Status           | Notes |
| --- | -------------- | ---------------- | ----- |
| 1   | attendance-api | ⚠️ Deprecated    | Consolidated into other modules |

---

_Document updated: June 28, 2026_
_Status: ✅ BACKEND API SPECIFICATION COMPLETE - SECURITY HARDENED_
_Security Audit: d2905bf_
_PRD Gap Analysis: docs/CHANGELOG/PRD-Alignment-Report.md
