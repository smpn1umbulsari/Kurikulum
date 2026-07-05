# API Refactoring Analysis - Shared Client Pattern

**Date:** 2026-06-26  
**Status:** 📊 ANALYZED

## Overview

Target: 11 Edge Functions yang perlu di-refactor untuk menggunakan pola client bersama.

---

## API Status Summary

| #   | API            | Current Pattern       | Target Pattern              | Priority |
| --- | -------------- | --------------------- | --------------------------- | -------- |
| 1   | academic-api   | `createClient` direct | `createSupabaseClient(req)` | HIGH     |
| 2   | assessment-api | `createClient` direct | `createSupabaseClient(req)` | HIGH     |
| 3   | attendance-api | `createClient` direct | `createSupabaseClient(req)` | HIGH     |
| 4   | dashboard-api  | `createClient` direct | `createSupabaseClient(req)` | HIGH     |
| 5   | export-api     | `createClient` direct | `createSupabaseClient(req)` | HIGH     |
| 6   | graduation-api | partial update        | `createSupabaseClient(req)` | MEDIUM   |
| 7   | guru-api       | `createClient` direct | `createSupabaseClient(req)` | MEDIUM   |
| 8   | kelas-api      | `createClient` direct | `createSupabaseClient(req)` | MEDIUM   |
| 9   | mapel-api      | `createClient` direct | `createSupabaseClient(req)` | MEDIUM   |
| 10  | rapor-api      | `createClient` direct | `createSupabaseClient(req)` | HIGH     |
| 11  | siswa-api      | `createClient` direct | `createSupabaseClient(req)` | MEDIUM   |

---

## Already Fixed (4 APIs) ✅

1. **archive-api** - ✅ Fixed
2. **promotion-api** - ✅ Fixed
3. **monitoring-api** - ✅ Fixed
4. **graduation-api** - ⚠️ Partial (import fixed, need HTTP handler update)

---

## Refactoring Pattern

### Before (Old Pattern):

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// In serve handler:
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  { auth: { persistSession: false } },
);
```

### After (Shared Pattern):

```typescript
import {
  createSupabaseClient,
  createAdminClient,
} from "../_shared/supabase-client.ts";

// In serve handler:
const supabaseClient = createSupabaseClient(req);
```

### For Admin Operations:

```typescript
const supabaseClient = createAdminClient();
```

---

## Changes Required Per API

### 1. Import Changes

```typescript
// OLD:
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// NEW:
import {
  createSupabaseClient,
  createAdminClient,
} from "../_shared/supabase-client.ts";
```

### 2. HTTP Handler Changes

```typescript
// OLD:
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  { auth: { persistSession: false } },
);

// NEW:
const supabaseClient = createSupabaseClient(req);
```

### 3. Auth Helper Changes

```typescript
// OLD:
async function getAuthenticatedUser(req: Request, supabaseClient: any) { ... }

// NEW:
async function getAuthenticatedUser(req: Request) {
  const supabaseClient = createAdminClient();
  ...
}
```

---

## Effort Estimation

| Priority   | APIs                                                       | Estimated Time |
| ---------- | ---------------------------------------------------------- | -------------- |
| HIGH (4)   | academic, assessment, attendance, dashboard, export, rapor | 30 min         |
| MEDIUM (5) | guru, kelas, mapel, siswa, graduation                      | 25 min         |
| **Total**  | **11 APIs**                                                | **~55 min**    |

---

## Next Steps

1. [ ] Refactor HIGH priority APIs (academic, assessment, attendance, dashboard, export, rapor)
2. [ ] Refactor MEDIUM priority APIs (guru, kelas, mapel, siswa, graduation)
3. [ ] Test all refactored APIs
4. [ ] Update API documentation
