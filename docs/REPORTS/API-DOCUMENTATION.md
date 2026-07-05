# SIKAD v4.0 API Documentation

**Version:** 1.0.0  
**Date:** 26 June 2026  
**Base URL:** `https://<project>.supabase.co/functions/v1/`

---

## Authentication

Most write operations require JWT authentication.

### Headers

```
Authorization: Bearer <jwt_token>
apikey: <supabase_anon_key>
Content-Type: application/json
```

### Response Codes

- `200` - Success
- `401` - Unauthorized (missing/invalid token)
- `404` - Not Found
- `500` - Server Error

---

## 1. Guru API

**Endpoint:** `/guru-api`

### GET /guru-api

List all teachers.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (AKTIF, NON_AKTIF) |
| `limit` | number | Pagination limit (default: 50) |
| `page` | number | Page number (default: 1) |

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "nip": "string",
      "nama": "string",
      "jk": "L/P",
      "status": "AKTIF"
    }
  ]
}
```

### GET /guru-api/:id

Get single teacher by ID.

### POST /guru-api

Create new teacher. **Auth required.**

**Body:**

```json
{
  "nip": "string",
  "nama": "string",
  "jk": "L",
  "tempat_lahir": "string",
  "tanggal_lahir": "2024-01-15",
  "status": "AKTIF"
}
```

### PUT /guru-api/:id

Update teacher. **Auth required.**

---

## 2. Siswa API

**Endpoint:** `/siswa-api`

### GET /siswa-api

List all students.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `kelas_id` | uuid | Filter by class |
| `status` | string | Filter by status |
| `search` | string | Search by nama/NISN |
| `limit` | number | Pagination limit |
| `page` | number | Page number |

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "nisn": "string",
      "nipd": "string",
      "nama": "string",
      "jk": "L/P",
      "status": "AKTIF"
    }
  ]
}
```

### GET /siswa-api/:id

Get single student.

### POST /siswa-api

Create student. **Auth required.**

### PUT /siswa-api/:id

Update student. **Auth required.**

---

## 3. Mata Pelajaran API

**Endpoint:** `/mapel-api`

### GET /mapel-api

List all subjects.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `kelompok` | string | Filter by kelompok (A/B/C/D) |

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "kode": "string",
      "nama": "string",
      "kelompok": "A"
    }
  ]
}
```

### GET /mapel-api/:id

Get single subject.

### POST /mapel-api

Create subject. **Auth required.**

### PUT /mapel-api/:id

Update subject. **Auth required.**

---

## 4. Academic Terms API

**Endpoint:** `/academic-api`

### GET /academic-api

List all academic terms.

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "tahun_ajaran": "2024/2025",
      "semester": "GANJIL",
      "tanggal_mulai": "2024-07-15",
      "tanggal_selesai": "2024-12-20",
      "status": "AKTIF"
    }
  ]
}
```

### GET /academic-api/:id

Get single term.

### POST /academic-api

Create term. **Auth required.**

### PUT /academic-api/:id

Update term. **Auth required.**

### POST /academic-api/:id/activate

Activate term.

---

## 5. Kelas API

**Endpoint:** `/kelas-api`

### GET /kelas-api

List all classes.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `tingkat` | number | Filter by tingkat (10, 11, 12) |
| `jenis` | string | Filter by jenis (REGULER, AKSELERASI) |
| `wali_id` | uuid | Filter by homeroom teacher |

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "nama_kelas": "X IPA 1",
      "tingkat": 10,
      "jenis": "REGULER",
      "tahun_ajaran": "2024/2025",
      "wali": { "id": "uuid", "nama": "string" }
    }
  ]
}
```

### GET /kelas-api/:id

Get single class with students.

### GET /kelas-api/:id/students

Get students in class.

### POST /kelas-api

Create class. **Auth required.**

### PUT /kelas-api/:id

Update class. **Auth required.**

### PUT /kelas-api/:id/wali

Assign homeroom teacher. **Auth required.**

---

## 6. Assessment API

**Endpoint:** `/assessment-api`

### GET /assessment-api

List all assessments.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `term_id` | uuid | Filter by academic term |
| `type_id` | uuid | Filter by assessment type |
| `stage` | string | Filter by stage (DRAFT, PUBLISHED, ARCHIVED) |
| `tanggal_mulai` | date | Filter start date |
| `tanggal_selesai` | date | Filter end date |

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "judul": "Ulangan Harian 1",
      "tanggal": "2024-09-15",
      "bobot": 25,
      "stage": "PUBLISHED",
      "assessment_type": {
        "nama": "Ulangan Harian",
        "kategori": "PENILAIAN_HARIAN"
      }
    }
  ]
}
```

### GET /assessment-api/types

Get all assessment types.

### GET /assessment-api/:id

Get single assessment.

### GET /assessment-api/:id/details

Get student grades for assessment.

### POST /assessment-api

Create assessment. **Auth required.**

**Body:**

```json
{
  "assessment_type_id": "uuid",
  "pembagian_mengajar_id": "uuid",
  "academic_term_id": "uuid",
  "judul": "Ulangan Harian 1",
  "deskripsi": "Materi Bab 1",
  "tanggal": "2024-09-15",
  "bobot": 25
}
```

### PUT /assessment-api/:id

Update assessment. **Auth required.**

### POST /assessment-api/:id/publish

Publish assessment (DRAFT → PUBLISHED). **Auth required.**

### POST /assessment-api/:id/archive

Archive assessment (PUBLISHED → ARCHIVED). **Auth required.**

### POST /assessment-api/details

Input/update student grade. **Auth required.**

**Body:**

```json
{
  "assessment_id": "uuid",
  "siswa_id": "uuid",
  "nilai": 85.5,
  "catatan": "Baik"
}
```

---

## 7. Attendance API

**Endpoint:** `/attendance-api`

### GET /attendance-api

List all attendance records.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `term_id` | uuid | Filter by academic term |
| `siswa_id` | uuid | Filter by student |
| `tanggal_mulai` | date | Filter start date |
| `tanggal_selesai` | date | Filter end date |
| `status` | string | Filter by status (HADIR, SAKIT, IZIN, ALPHA) |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "tanggal": "2024-09-16",
      "status": "HADIR",
      "keterangan": null,
      "siswa": {
        "id": "uuid",
        "nama": "string"
      }
    }
  ],
  "count": 100,
  "page": 1,
  "limit": 50
}
```

### GET /attendance-api/:id

Get single attendance record.

### GET /attendance-api/rekap

Get attendance summary for student.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `siswa_id` | uuid | Student ID (required) |
| `tanggal_mulai` | date | Start date (required) |
| `tanggal_selesai` | date | End date (required) |
| `term_id` | uuid | Academic term |

**Response:**

```json
{
  "data": {
    "total": 20,
    "hadir": 18,
    "sakit": 1,
    "izin": 0,
    "alpha": 1
  }
}
```

### GET /attendance-api/by-date

Get attendance by date for a class.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `tanggal` | date | Date (required) |
| `pembagian_mengajar_id` | uuid | Teaching assignment (required) |

### POST /attendance-api

Input/update attendance. **Auth required.**

**Single Entry:**

```json
{
  "academic_term_id": "uuid",
  "pembagian_mengajar_id": "uuid",
  "siswa_id": "uuid",
  "tanggal": "2024-09-16",
  "status": "HADIR",
  "keterangan": null
}
```

**Bulk Entry:**

```json
{
  "academic_term_id": "uuid",
  "pembagian_mengajar_id": "uuid",
  "tanggal": "2024-09-16",
  "entries": [
    { "siswa_id": "uuid", "status": "HADIR" },
    { "siswa_id": "uuid", "status": "SAKIT", "keterangan": "Demam" }
  ]
}
```

---

## 8. Rapor API

**Endpoint:** `/rapor-api`

### GET /rapor-api

Get student report card.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `siswa_id` | uuid | Student ID (required) |
| `term_id` | uuid | Academic term ID (required) |

**Response:**

```json
{
  "data": {
    "siswa": {
      "id": "uuid",
      "nisn": "string",
      "nama": "string",
      "jk": "L"
    },
    "term": {
      "tahun_ajaran": "2024/2025",
      "semester": "GANJIL"
    },
    "kelas": {
      "nama_kelas": "X IPA 1"
    },
    "mapel": [
      {
        "mapel": { "nama": "Matematika" },
        "guru": { "nama": "Dr. Smith" },
        "nilai": 85.5,
        "deskripsi": "Baik dalam memahami materi"
      }
    ],
    "catatan": "Siswa aktif berpartisipasi",
    "kehadiran": {
      "total": 20,
      "hadir": 19,
      "sakit": 1,
      "izin": 0,
      "alpha": 0
    }
  }
}
```

### GET /rapor-api/kelas

Get report cards for entire class.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `kelas_id` | uuid | Class ID (required) |
| `term_id` | uuid | Academic term ID (required) |

**Response:**

```json
{
  "data": [
    {
      "siswa": {
        "id": "uuid",
        "nama": "string"
      },
      "kehadiran": {
        "hadir": 19,
        "total": 20,
        "persensi": 95
      }
    }
  ]
}
```

### POST /rapor-api

Save/update class teacher notes. **Auth required.**

**Body:**

```json
{
  "term_id": "uuid",
  "siswa_id": "uuid",
  "kelas_id": "uuid",
  "catatan": "Siswa berprestasi dalam matematika"
}
```

---

## Assessment Types

| Kategori            | Nama                    |
| ------------------- | ----------------------- |
| PENILAIAN_HARIAN    | Ulangan Harian          |
| PENILAIAN_TENGAH    | Ulangan Tengah Semester |
| PENILAIAN_AKHIR     | Ulangan Akhir Semester  |
| PENILAIAN_PRATIKUM  | Pratikum                |
| PENILAIAN_PROYEK    | Proyek                  |
| PENILAIAN_PORTFOLIO | Portofolio              |

## Attendance Status

| Status | Description               |
| ------ | ------------------------- |
| HADIR  | Present                   |
| SAKIT  | Sick                      |
| IZIN   | Permitted                 |
| ALPHA  | Absent without permission |

## Assessment Stage

| Stage     | Description         |
| --------- | ------------------- |
| DRAFT     | Not yet published   |
| PUBLISHED | Visible to students |
| ARCHIVED  | Archived            |

---

**Generated:** 26 June 2026  
**SIKAD v4.0** - School Management System
