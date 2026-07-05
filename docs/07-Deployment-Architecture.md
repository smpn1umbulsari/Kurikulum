# 07-Deployment-Architecture.md

# DEPLOYMENT ARCHITECTURE

## SIKAD v4.0

Version: 4.0

Status: APPROVED

Environment:

```text
Development
Staging
Production
```

---

# TUJUAN

Dokumen ini mendefinisikan arsitektur deployment SIKAD v4.0 mulai dari:

```text
Developer Laptop
↓
Staging
↓
Production
↓
Monitoring
↓
Backup
↓
Recovery
```

---

# HIGH LEVEL ARCHITECTURE

```text
┌─────────────────────┐
│     End User        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ React 19 Frontend   │
│ PWA + Tauri v2      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Supabase Platform   │
├─────────────────────┤
│ Authentication      │
│ PostgreSQL          │
│ Realtime            │
│ Storage             │
│ Edge Functions      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Monitoring Layer    │
└─────────────────────┘
```

---

# TARGET PLATFORM

## Web

Deployment:

```text
PWA
```

---

Support:

```text
Chrome
Edge
Firefox
Safari
```

---

## Desktop

Deployment:

```text
Tauri v2
```

---

Output:

```text
Windows EXE
Windows MSI
```

---

# ENVIRONMENT STRATEGY

## Development

Purpose:

```text
Local Development
```

---

Database:

```text
Supabase Development Project
```

---

Branch:

```text
develop
```

---

## Staging

Purpose:

```text
UAT
QA
Testing
```

---

Database:

```text
Supabase Staging Project
```

---

Branch:

```text
staging
```

---

## Production

Purpose:

```text
Live System
```

---

Database:

```text
Supabase Production Project
```

---

Branch:

```text
main
```

---

# SOURCE CONTROL

Platform:

```text
GitHub
```

---

Branching:

```text
main
staging
develop
feature/*
hotfix/*
```

---

# GIT FLOW

```text
feature
↓
develop
↓
staging
↓
main
```

---

# FRONTEND DEPLOYMENT

## Recommended

```text
Cloudflare Pages
```

---

Alternative:

```text
Vercel
Netlify
Firebase Hosting
```

---

# BUILD FLOW

```text
GitHub Push
↓
Build
↓
Test
↓
Deploy
```

---

# DOMAIN STRUCTURE

## Production

```text
app.sikad.sch.id
```

---

## Staging

```text
staging.sikad.sch.id
```

---

## API

```text
supabase.co
```

---

# SUPABASE ARCHITECTURE

Services:

```text
Auth
Database
Realtime
Storage
Edge Functions
```

---

# AUTH

Provider:

```text
Email Password
```

---

Future:

```text
Google Login
SSO
```

---

# DATABASE

Engine:

```text
PostgreSQL 16
```

---

Extensions:

```text
pgcrypto
uuid-ossp
pg_stat_statements
```

---

# STORAGE

Buckets:

```text
avatars
exports
rapor
archive
documents
```

---

# REALTIME

Channels:

```text
assessment-updates
attendance-updates
dashboard-updates
monitoring-updates
```

---

# DESKTOP ARCHITECTURE

## Tauri

```text
React
↓
Rust Runtime
↓
Windows
```

---

Benefits:

```text
Small Size
Fast Startup
Secure
```

---

# OFFLINE ARCHITECTURE

```text
React
↓
Dexie
↓
Sync Queue
↓
Supabase
```

---

# LOCAL DATABASE

Engine:

```text
IndexedDB
```

---

Wrapper:

```text
Dexie.js
```

---

# DEPLOYMENT PIPELINE

## CI

GitHub Actions

---

Jobs:

```text
Lint
Type Check
Unit Test
Build
```

---

# CD

Deploy:

```text
Staging
Production
```

---

# PIPELINE FLOW

```text
Push
↓
Lint
↓
Test
↓
Build
↓
Deploy
↓
Smoke Test
```

---

# ENVIRONMENT VARIABLES

## Frontend

```env
VITE_SUPABASE_URL=

VITE_SUPABASE_ANON_KEY=

VITE_APP_VERSION=

VITE_ENVIRONMENT=
```

---

## Secrets

Stored In:

```text
GitHub Secrets
```

---

Never Stored In:

```text
Source Code
Repository
Frontend Constants
```

---

# DATABASE MIGRATION FLOW

Tool:

```text
Supabase CLI
```

---

Flow:

```text
Migration File
↓
Review
↓
Staging
↓
Production
```

---

# MIGRATION RULES

Never:

```text
Edit Existing Migration
```

---

Always:

```text
Create New Migration
```

---

# BACKUP STRATEGY

## Database

Frequency:

```text
Daily
```

---

Retention:

```text
30 Hari
```

---

## Archive Snapshot

Retention:

```text
Permanent
```

---

## Export Files

Retention:

```text
30 Hari
```

---

# RECOVERY OBJECTIVES

## RPO

```text
24 Jam
```

Maximum data loss.

---

## RTO

```text
4 Jam
```

Maximum downtime.

---

# OBSERVABILITY

## Application Monitoring

Track:

```text
Frontend Errors
API Errors
Sync Failures
Conflict Queue
```

---

## Database Monitoring

Track:

```text
Slow Query
Storage Growth
Connection Count
```

---

## Business Monitoring

Track:

```text
Login Activity
Assessment Activity
Rapor Activity
Promotion Activity
Graduation Activity
```

---

# SECURITY ARCHITECTURE

## Layer 1

```text
Authentication
```

---

## Layer 2

```text
RBAC
```

---

## Layer 3

```text
RLS
```

---

## Layer 4

```text
Audit Logs
```

---

# PRODUCTION CHECKLIST

## Infrastructure

```text
✓ Domain

✓ SSL

✓ Supabase

✓ Storage

✓ Backup
```

---

## Security

```text
✓ RLS

✓ Audit

✓ HTTPS

✓ Secrets
```

---

## Application

```text
✓ Build Success

✓ UAT Passed

✓ Migration Success

✓ Dashboard Verified
```

---

# DISASTER RECOVERY PLAN

## Scenario 1

Database Failure

Flow:

```text
Restore Backup
↓
Verify Integrity
↓
Open Access
```

---

## Scenario 2

Deployment Failure

Flow:

```text
Rollback Release
↓
Restore Previous Build
```

---

## Scenario 3

Migration Failure

Flow:

```text
Rollback Migration
↓
Restore Snapshot
↓
Retry
```

---

# SCALABILITY TARGET

## Initial

```text
50 Guru
1000 Siswa
```

---

## Medium

```text
250 Guru
5000 Siswa
```

---

## Large

```text
1000 Guru
25000 Siswa
```

---

# ACCEPTANCE CRITERIA

✓ Multi Environment

✓ CI/CD Pipeline

✓ Backup Strategy

✓ Disaster Recovery

✓ Offline Support

✓ Desktop Support

✓ Monitoring

✓ Secure Secrets

✓ Migration Workflow

✓ Production Ready

---

# FINAL DEPLOYMENT PRINCIPLE

SIKAD v4.0 menggunakan pendekatan:

```text
Cloud First
Offline Capable
Database Centric
RLS Secured
Snapshot Driven
```

dengan:

```text
React 19
+
Supabase
+
Dexie
+
Tauri v2
```

sebagai arsitektur produksi utama yang siap digunakan untuk sekolah tunggal maupun multi-sekolah di masa depan.
