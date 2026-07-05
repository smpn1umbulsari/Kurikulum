# 11-Coding-Standards.md

# CODING STANDARDS

## SIKAD v4.0

Version: 4.0

Status: APPROVED

---

# TUJUAN

Dokumen ini mendefinisikan standar coding seluruh source code SIKAD v4.0 agar:

* Konsisten
* Mudah dipelihara
* Mudah direview
* AI Friendly
* Scalable

---

# GENERAL PRINCIPLES

## Rule 1

Kode harus:

```text
Readable > Clever
```

---

## Rule 2

Hindari:

```text
Magic Number
Magic String
```

---

## Rule 3

Semua business logic wajib berada di:

```text
Service Layer
```

Bukan:

```text
Component
Page
```

---

# TYPESCRIPT RULES

## Strict Mode

Wajib:

```json
{
  "strict": true
}
```

---

## Any

Dilarang:

```typescript
const data:any
```

---

Gunakan:

```typescript
interface
type
```

---

# NAMING CONVENTION

## Component

```typescript
TeacherTable.tsx
AssessmentForm.tsx
```

---

## Hook

```typescript
useAssessment.ts

useCurrentTerm.ts
```

---

## Service

```typescript
assessmentService.ts

raporService.ts
```

---

## Repository

```typescript
assessmentRepository.ts
```

---

## Store

```typescript
authStore.ts
```

---

# FILE SIZE LIMIT

## Component

Maximum:

```text
300 Lines
```

---

## Service

Maximum:

```text
500 Lines
```

---

Jika lebih:

```text
Refactor
```

---

# COMPONENT RULES

## Component Responsibility

Satu komponen:

```text
Satu Tanggung Jawab
```

---

Bad:

```text
Form
Table
Modal
Business Logic
```

dalam satu file.

---

Good:

```text
Form

Table

Modal

Service
```

terpisah.

---

# SERVICE RULES

Service berisi:

```text
Business Logic
Validation
Workflow
```

---

Contoh:

```typescript
assessmentService.finalize()
```

---

# REPOSITORY RULES

Repository hanya:

```text
CRUD
Database Access
```

---

Tidak boleh:

```text
Business Logic
```

---

# DATABASE RULES

Semua query:

```text
Repository Layer
```

---

Dilarang:

```typescript
supabase
```

langsung dari:

```text
Component
Page
```

---

# STATE MANAGEMENT

Library:

```text
Zustand
```

---

Store hanya untuk:

```text
UI State

Session State

Global State
```

---

Tidak untuk:

```text
Business Logic
```

---

# FORM RULES

Library:

```text
React Hook Form
```

---

Validation:

```text
Zod
```

---

# TABLE RULES

Library:

```text
TanStack Table
```

---

# QUERY RULES

Library:

```text
TanStack Query
```

---

Semua server state wajib menggunakan:

```text
useQuery
useMutation
```

---

# ERROR HANDLING

Wajib:

```typescript
try
catch
```

---

Format:

```typescript
{
 success:false,
 error:"..."
}
```

---

# LOGGING

Allowed:

```typescript
logger.info()
logger.error()
```

---

Forbidden:

```typescript
console.log()
```

Production.

---

# IMPORT ORDER

```text
React

Libraries

Shared

Module

Local
```

---

# CSS RULES

Framework:

```text
TailwindCSS
```

---

Gunakan:

```text
Design Tokens
```

---

Dilarang:

```text
Inline Style
```

kecuali kebutuhan khusus.

---

# ACCESS CONTROL

Frontend:

```text
Hide UI
```

---

Backend:

```text
RLS
```

---

Jangan pernah menganggap:

```text
Hidden Button
=
Security
```

---

# TESTING RULES

Setiap service wajib memiliki:

```text
Unit Test
```

---

Setiap workflow wajib memiliki:

```text
Integration Test
```

---

# GIT RULES

Commit Format:

```text
feat:

fix:

refactor:

test:

docs:
```

---

Contoh:

```text
feat(assessment): add finalize workflow
```

---

# BRANCH RULES

```text
feature/*
bugfix/*
hotfix/*
```

---

# CODE REVIEW CHECKLIST

✓ Type Safe

✓ No Any

✓ Tested

✓ RLS Compatible

✓ No Business Logic In UI

✓ No Direct Supabase Access

✓ Error Handling

✓ Naming Consistent

---

# PERFORMANCE RULES

Target:

```text
Initial Load < 3 sec

Dashboard < 2 sec

Query < 300 ms
```

---

# FINAL PRINCIPLE

SIKAD v4.0 mengikuti prinsip:

```text
Clean Architecture
+
Feature Based Structure
+
Repository Pattern
+
Service Pattern
+
Offline First
```
