# 08-Testing-Strategy-TDD-UAT.md

# TESTING STRATEGY

## SIKAD v4.0

Version: 4.0

Status: APPROVED

Priority:

```text
CRITICAL
```

---

# TUJUAN

Memastikan seluruh fitur SIKAD v4.0 memenuhi:

```text
Functional Correctness
Data Integrity
Security
Performance
Reliability
Offline Capability
```

sebelum:

```text
Go Live Production
```

---

# TESTING PYRAMID

```text
                UAT
                 ▲
                 │
         Integration Test
                 ▲
                 │
            Unit Test
```

---

# TARGET COVERAGE

| Layer                | Target |
| -------------------- | ------ |
| Unit Test            | ≥ 80%  |
| Integration Test     | ≥ 70%  |
| UAT Scenario         | 100%   |
| Critical Flow        | 100%   |
| Migration Validation | 100%   |

---

# TEST ENVIRONMENTS

## Development

Purpose:

```text
Developer Testing
```

---

## Staging

Purpose:

```text
QA
UAT
Performance Testing
```

---

## Production

Purpose:

```text
Smoke Test Only
```

---

# TEST DATA STRATEGY

## Small Dataset

```text
10 Guru
50 Siswa
```

---

## Medium Dataset

```text
50 Guru
500 Siswa
```

---

## Production Simulation

```text
100 Guru
1500 Siswa
```

---

# UNIT TEST STRATEGY

Framework:

```text
Vitest
```

---

Coverage:

```text
Service
Repository
Utility
Business Rules
```

---

# MODULES

## Academic Term

Test:

```text
Create Term

Activate Term

Deactivate Term

Single Active Term Validation
```

---

## Guru

Test:

```text
Create Guru

Update Guru

Deactivate Guru

Role Assignment
```

---

## Siswa

Test:

```text
Create Siswa

Update Siswa

Soft Delete

Validation
```

---

## Assessment

Test:

```text
Create Assessment

Finalize Assessment

Version Increment

Validation
```

---

## Kehadiran

Test:

```text
Input Kehadiran

Bulk Kehadiran

Attendance Summary
```

---

## Rapor

Test:

```text
Generate

Finalize

Reopen

Versioning
```

---

## Promotion

Test:

```text
Promotion Validation

Promotion Execution

Rollback
```

---

## Graduation

Test:

```text
Graduation Validation

Graduation Execution

Snapshot Creation
```

---

## Workload Engine

Test:

```text
JP Mengajar

JP Tambahan

Total JP

Status Beban
```

---

# INTEGRATION TEST STRATEGY

Framework:

```text
Vitest + Supabase Test Project
```

---

# FLOW TESTING

## Assessment Flow

```text
Create Assessment
↓
Input Nilai
↓
Finalize
↓
Generate Rapor
```

---

Expected:

```text
Success
```

---

## Kehadiran Flow

```text
Input Kehadiran
↓
Summary
↓
Analytics
```

---

Expected:

```text
Accurate Summary
```

---

## Promotion Flow

```text
Generate Preview
↓
Execute
↓
Riwayat Kelas
```

---

Expected:

```text
Target Class Correct
```

---

## Graduation Flow

```text
Graduate Student
↓
Create Alumni
↓
Create Snapshot
```

---

Expected:

```text
No Data Loss
```

---

# DATABASE TESTING

## Constraint Testing

Validate:

```text
Unique Constraints

Foreign Keys

Check Constraints
```

---

Expected:

```text
Reject Invalid Data
```

---

# Trigger Testing

Validate:

```text
Audit Trigger

Version Trigger

Timestamp Trigger
```

---

Expected:

```text
Automatic Execution
```

---

# View Testing

Validate:

```text
Teacher Workload View

Dashboard View

Analytics View
```

---

Expected:

```text
Accurate Data
```

---

# RLS TESTING

Priority:

```text
VERY HIGH
```

---

# TEST MATRIX

| Role       | Test          |
| ---------- | ------------- |
| Guru       | Own Data Only |
| Wali Kelas | Own Class     |
| BK         | Allowed Data  |
| Kurikulum  | Academic Data |
| Kepsek     | Read Only     |
| Admin      | Full Access   |

---

# EXAMPLE

Guru A:

Attempt:

```text
Read Nilai Guru B
```

Expected:

```text
403 Access Denied
```

---

# OFFLINE TESTING

Priority:

```text
CRITICAL
```

---

# Scenario 1

Input Nilai Offline

Flow:

```text
Disconnect Internet
↓
Input Nilai
↓
Save Dexie
```

Expected:

```text
Success
```

---

# Scenario 2

Sync Recovery

Flow:

```text
Offline
↓
Input Data
↓
Online
↓
Auto Sync
```

Expected:

```text
Queue Empty
```

---

# Scenario 3

Conflict Detection

Flow:

```text
Cloud Edit
+
Local Edit
```

Expected:

```text
Conflict Queue Created
```

---

# PERFORMANCE TESTING

## Dashboard

Target:

```text
< 2 sec
```

---

## Workload

Target:

```text
< 1 sec
```

---

## Assessment Save

Target:

```text
< 500 ms
```

---

## Rapor Generate

Target:

```text
< 5 sec
```

---

## Bulk Export

Target:

```text
40 PDF < 30 sec
```

---

# LOAD TESTING

## Concurrent Users

Initial Target:

```text
25 Concurrent Users
```

---

Medium:

```text
100 Concurrent Users
```

---

# Scenarios

```text
Input Nilai

Input Kehadiran

Generate Rapor

Dashboard Access
```

---

# SECURITY TESTING

## Authentication

Test:

```text
Invalid Login

Expired Session

Token Manipulation
```

---

Expected:

```text
Blocked
```

---

## Authorization

Test:

```text
Role Escalation
```

Expected:

```text
Blocked
```

---

## RLS Bypass

Test:

```text
Direct Query
```

Expected:

```text
Blocked
```

---

# MIGRATION TESTING

## Dry Run 1

Dataset:

```text
Copy Production
```

---

Validate:

```text
Row Count

Integrity

Performance
```

---

## Dry Run 2

Repeat.

---

Expected:

```text
Same Result
```

---

# UAT STRATEGY

Participants:

```text
Admin

Kurikulum

Wali Kelas

Guru

BK

Kepala Sekolah
```

---

# UAT PHASE 1

## Master Data

Checklist:

```text
Create Guru

Create Siswa

Create Kelas
```

---

# UAT PHASE 2

## Akademik

Checklist:

```text
Pembagian Mengajar

Assessment

Nilai

Kehadiran
```

---

# UAT PHASE 3

## Rapor

Checklist:

```text
Generate

Finalize

Export
```

---

# UAT PHASE 4

## Promotion

Checklist:

```text
Preview

Execute

Validate
```

---

# UAT PHASE 5

## Graduation

Checklist:

```text
Graduate

Validate Alumni

Validate Snapshot
```

---

# UAT PHASE 6

## Dashboard

Checklist:

```text
Kepala Sekolah

Kurikulum

Monitoring
```

---

# UAT SIGN OFF

Required:

```text
Admin
Kurikulum
Kepala Sekolah
```

---

# REGRESSION TESTING

Mandatory Before Release:

```text
Authentication

Assessment

Kehadiran

Rapor

Promotion

Graduation

Sync Engine
```

---

# RELEASE GATES

## Gate 1

```text
Unit Test Pass
```

---

## Gate 2

```text
Integration Test Pass
```

---

## Gate 3

```text
RLS Validation Pass
```

---

## Gate 4

```text
Migration Validation Pass
```

---

## Gate 5

```text
UAT Approved
```

---

## Gate 6

```text
Performance Approved
```

---

# GO LIVE CHECKLIST

```text
✓ Backup Created

✓ Migration Success

✓ RLS Active

✓ Dashboard Verified

✓ Sync Engine Verified

✓ Export Verified

✓ Monitoring Active
```

---

# POST GO LIVE

Monitoring Period:

```text
14 Hari
```

---

Daily Checks:

```text
Sync Queue

Conflict Queue

Audit Logs

Performance

User Feedback
```

---

# SUCCESS CRITERIA

## Functional

```text
100% UAT Passed
```

---

## Security

```text
0 Critical Vulnerability
```

---

## Performance

```text
All SLA Met
```

---

## Migration

```text
0 Data Loss
```

---

## Reliability

```text
0 Critical Incident
```

---

# FINAL TESTING PRINCIPLE

Tidak ada fitur yang dianggap selesai hanya karena:

```text
Developer Test Passed
```

Fitur dianggap selesai jika:

```text
Unit Test
+
Integration Test
+
RLS Test
+
UAT Test
+
Performance Test
```

seluruhnya lulus dan terdokumentasi.
