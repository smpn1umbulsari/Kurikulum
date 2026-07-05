# 12-AI-Agents.md

# AI AGENTS SPECIFICATION

## SIKAD v4.0

Version: 4.0

Status: APPROVED

**Last Updated:** 28 June 2026

**AETHER Platform Status:** ✅ All 9 Phases Complete (0-9) | 72/72 Tests Passed

**Recent Changes:**
- Phase 0-9 all completed with 100% test pass rate
- RBAC Engine and Audit Ledger implemented (Phase 9)
- Security hardening on all 8 APIs completed
- SIKAD Hybrid Integration: 24/24 tasks completed

---

# AETHER PLATFORM STATUS

## Phase Completion Matrix

| Phase | Name | Status | Components | Test Results |
|-------|------|--------|------------|--------------|
| Phase 0 | Foundation | ✅ COMPLETE | CLI, Schema Parser, Workspace Layout | 5/5 PASS |
| Phase 1 | Core Engine | ✅ COMPLETE | EventBus, FileWatcher, LockManager | 5/5 PASS |
| Phase 2 | Context Engine | ✅ COMPLETE | SQLite Cache, Context Assembler | 3/3 PASS |
| Phase 3 | Knowledge Graph | ✅ COMPLETE | Dependency Graph, Semantic Indexer | 5/5 PASS |
| Phase 4 | Workflow Engine | ✅ COMPLETE | TaskTracker, Kanban, Implementation Plan | 4/4 PASS |
| Phase 5 | Agent Manager | ✅ COMPLETE | API Gateway, Agent Profiles, Multi-Agent | 12/12 PASS |
| Phase 6 | Quality Engine | ✅ COMPLETE | Auto-Linter, Test Runner, Auto-Remediation | 5/5 PASS |
| Phase 7 | Dashboard | ✅ COMPLETE | Token Tracker, Action Logger, Compliance | 6/6 PASS |
| Phase 8 | Marketplace | ✅ COMPLETE | Plugin Manager, Rule Sharing, Registry | 12/12 PASS |
| Phase 9 | Enterprise | ✅ COMPLETE | RBAC Engine, Audit Ledger, Team Sync | 20/20 PASS |

## AETHER Test Summary

| Metric | Value |
|--------|-------|
| Total Test Suites | 11 |
| Total Test Cases | 72 |
| Passed | 72 |
| Failed | 0 |
| Success Rate | **100%** |

## AETHER Core Modules (22/22)

| Module | File | Status |
|--------|------|--------|
| ProjectManager | `src/core/ProjectManager.js` | ✅ |
| EventBus | `src/core/EventBus.js` | ✅ |
| FileWatcher | `src/core/FileWatcher.js` | ✅ |
| LockManager | `src/core/LockManager.js` | ✅ |
| ContextEngine | `src/core/ContextEngine.js` | ✅ |
| KnowledgeGraph | `src/core/KnowledgeGraph.js` | ✅ |
| SemanticIndexer | `src/core/SemanticIndexer.js` | ✅ |
| TaskEngine | `src/core/TaskEngine.js` | ✅ |
| WorkflowEngine | `src/core/WorkflowEngine.js` | ✅ |
| RuleEngine | `src/core/RuleEngine.js` | ✅ |
| DecisionEngine | `src/core/DecisionEngine.js` | ✅ |
| AgentManager | `src/core/AgentManager.js` | ✅ |
| PromptEngine | `src/core/PromptEngine.js` | ✅ |
| QualityEngine | `src/core/QualityEngine.js` | ✅ |
| MonitoringEngine | `src/core/MonitoringEngine.js` | ✅ |
| SecurityEngine | `src/core/SecurityEngine.js` | ✅ |
| VersionManager | `src/core/VersionManager.js` | ✅ |
| ReleaseManager | `src/core/ReleaseManager.js` | ✅ |
| PluginEngine | `src/core/PluginEngine.js` | ✅ |
| RBACEngine | `src/core/RBACEngine.js` | ✅ |
| AuditLedger | `src/core/AuditLedger.js` | ✅ |
| TeamSyncServer | `src/core/TeamSyncServer.js` | ✅ |

---

# TUJUAN

Dokumen ini mendefinisikan pembagian tugas AI Agent agar pengembangan paralel tetap konsisten.

Target:

```text
Claude
Cline
Antigravity
Codex
GPT
```

---

# GLOBAL RULES

Semua agent wajib:

- Mengikuti PRD
- Mengikuti TDD
- Mengikuti ERD
- Mengikuti Coding Standards
- Tidak membuat struktur sendiri

---

# AGENT 1

## Database Architect

Role:

```text
Database
Migration
RLS
Performance
```

---

Ownership:

```text
supabase/

migrations/

policies/

views/

triggers/
```

---

Tasks:

```text
Schema

Indexes

Constraints

Views

Materialized Views

RLS Policies
```

---

Forbidden:

```text
React UI
```

---

# AGENT 2

## Backend Domain Engineer

Role:

```
Business Logic
Supabase Edge Functions
Service Layer
Repository Layer
```

---

Ownership:

```
supabase/functions/

services/

repositories/
```

---

Tasks:

```
Assessment Engine

Workload Engine

Promotion Engine (supabase/functions/promotion-api)

Graduation Engine (supabase/functions/graduation-api)

Archive Engine (supabase/functions/archive-api)

Dashboard Engine (supabase/functions/dashboard-api)

Monitoring Engine (supabase/functions/monitoring-api)

Export Engine (supabase/functions/export-api)
```

---

Forbidden:

```
Database Migration
```

---

# AGENT 3

## Frontend Application Engineer

Role:

```text
UI
Forms
Tables
Navigation
```

---

Ownership:

```text
pages/

components/

hooks/
```

---

Tasks:

```text
CRUD

Dashboard

Data Entry

User Experience
```

---

Forbidden:

```text
Business Logic
```

---

# AGENT 4

## Offline & Sync Engineer

Role:

```text
Dexie

Offline

Realtime

Conflict Resolution
```

---

Ownership:

```text
database/dexie

services/sync
```

---

Tasks:

```text
Sync Queue

Conflict Queue

Retry Engine

Offline Cache
```

---

Forbidden:

```text
Assessment Rules
```

---

# AGENT 5

## Reporting & Analytics Engineer

Role:

```text
Analytics

Dashboard

Reporting

Export
```

---

Ownership:

```text
reporting/

dashboard/

export/
```

---

Tasks:

```text
Analytics Snapshot

KPI Engine

PDF Export

Excel Export
```

---

# AGENT 6

## QA & Security Engineer

Role:

```text
Testing

Audit

Security
```

---

Ownership:

```text
tests/

security/
```

---

Tasks:

```text
Unit Test

Integration Test

RLS Validation

Performance Test

UAT Checklist
```

---

# DEVELOPMENT FLOW

```text
Database Agent
↓
Backend Agent
↓
Frontend Agent
↓
Sync Agent
↓
Analytics Agent
↓
QA Agent
```

---

# TASK HANDOFF FORMAT

Setiap agent wajib menghasilkan:

```markdown
## Completed

...

## Changed Files

...

## Dependencies

...

## Risks

...
```

---

# PULL REQUEST TEMPLATE

```markdown
Feature:

Files:

Database Impact:

RLS Impact:

Tests:

Risks:
```

---

# CONFLICT RESOLUTION

Jika dua agent mengubah:

```text
Entity Sama
```

maka prioritas:

```text
Database Architect
↓
Backend Engineer
↓
Frontend Engineer
```

---

# AGENT OUTPUT RULES

Setiap agent wajib:

✓ TypeScript Strict

✓ No Any

✓ Testable

✓ Modular

✓ RLS Compatible

✓ Offline Compatible

---

# CLAUDE CONFIG

Recommended Role:

```text
Backend Domain Engineer
```

Karena kuat pada:

```text
Architecture
Refactoring
Business Logic
```

---

# GPT CONFIG

Recommended Role:

```text
Database Architect
QA Engineer
```

Karena kuat pada:

```text
Schema
Documentation
Analysis
```

---

# CLINE CONFIG

Recommended Role:

```text
Frontend Engineer
Implementation Agent
```

Karena kuat pada:

```text
Code Generation
Multi-file Refactor
Execution
```

---

# ANTIGRAVITY CONFIG

Recommended Role:

```text
Full Stack Support Agent
```

Digunakan untuk:

```text
Refactor
Boilerplate
Utility
Testing
```

---

# FINAL TEAM STRUCTURE

```text
Database Architect

Backend Domain Engineer

Frontend Engineer

Offline Sync Engineer

Reporting Engineer

QA Engineer
```

---

# FINAL PRINCIPLE

AI Agent tidak boleh:

```text
Menebak Arsitektur
Menambah Tabel Baru
Mengubah Workflow Inti
Mengubah ERD
```

tanpa perubahan resmi pada:

```text
PRD
TDD
ERD
```

Seluruh implementasi harus tunduk pada spesifikasi SIKAD v4.0 sebagai single source of truth.

---

# PHASE COMPLETION WORKFLOW

Setiap kali AETHER selesai mengerjakan 1 fase, wajib mengikuti workflow berikut:

## 1. AETHER MENYELESAIKAN FASE

```text
Fase Implementation Complete
↓
Create Phase Report → docs/CHANGELOG/report_[epic/fase]_X.md
↓
Submit untuk QA Review
```

## 2. QA AUDIT PROCESS

```text
QA menerima phase report
↓
QA melakukan analisis code review
↓
QA memberikan skor kualitas (0-10)
↓
Jika skor >= 9.5 → APPROVED
↓
Jika skor < 9.0 → REMEDIATION REQUIRED
```

## 3. REMEDIATION FLOW

Jika skor < 9.0:

```text
QA tulis finding di report fase
↓
AETHER implement perbaikan
↓
AETHER update report dengan remediation
↓
QA review ulang
↓
Jika skor >= 9.5 → APPROVED
```

## 4. QA REPORT TEMPLATE

Setiap QA Report harus berisi:

```markdown
# QA Audit & Analysis Report - [Project] [Phase/Fase] [X]: [Title]

> **Tanggal Audit:** [DATE]
> **Auditor:** QA Architect (AI Agent)
> **Status:** ✅ APPROVED / ⚠️ DRAFT (PENDING REMEDIATION)
> **Skor Kualitas:** [SCORE] / 10

---

## 1. PENDAHULUAN

[Deskripsi phase yang di-audit]

---

## 2. HASIL PEMERIKSAAN KUALITAS KODE (QA FINDINGS)

### Finding N: [Title]

- **Deskripsi:** [Detail finding]
- **Risiko:** [Risk assessment]
- **Rekomendasi:** [Remediation recommendation]
- **Status:** ✅ LULUS / ❌ GAGAL
- **Verifikasi:** [Test evidence]

---

## 3. TEST RESULTS SUMMARY

| #   | Test Case   | Status |
| --- | ----------- | ------ |
| [N] | [Test name] | ✅/❌  |

**Total: [PASSED]/[TOTAL]**

---

## 4. REMEDIATION PLAN (If score < 9.0)

| #   | File Target | Deskripsi Perbaikan | Prioritas       |
| --- | ----------- | ------------------- | --------------- |
| [N] | [file]      | [fix description]   | High/Medium/Low |

---

## 5. VERIFIKASI REMEDIASI

[Status after remediation]
**Skor Akhir: [FINAL_SCORE]/10 - [APPROVED/REJECTED]**
```

## 5. SKOR KUALITAS STANDARDS

| Skor      | Status                  | Action                        |
| --------- | ----------------------- | ----------------------------- |
| 9.5 - 10  | ✅ APPROVED             | Siap untuk fase berikutnya    |
| 9.0 - 9.4 | ⚠️ CONDITIONAL          | Minor fixes, quick turnaround |
| 8.0 - 8.9 | ⚠️ REMEDIATION REQUIRED | Finding harus diperbaiki      |
| < 8.0     | ❌ REJECTED             | Fase harus diulang            |

## 6. DELIVERABLES CHECKLIST

Setiap fase harus menghasilkan:

- [ ] Source code implementasi
- [ ] Unit/Integration tests (min 80% coverage)
- [ ] QA Audit Report di `docs/CHANGELOG/`
- [ ] Git commit dengan semantic versioning
- [ ] Documentation update
