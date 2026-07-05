# 03-verdict.md — Sync Validation Modal Design Audit Verdict

## Verdict: REFINE

**Reasoning:** Total score is 19/30 — below the 20 threshold but no principle scored 0. The component is functionally sound (primary task support scored 3/3) and honest in intent, but has high-priority optimization issues and minor accessibility gaps. The problems are fixable without structural redesign.

---

## Top 3-5 Highest-Leverage Moves

### 1. Fix #9 Eco-friendly: Reduce API calls from 17 to 1 (HIGHEST PRIORITY)

**Evidence:** Lines 171-205 in SyncValidationModal.tsx trigger 17 separate Supabase count queries when opening in "tarik" mode. This is a significant performance anti-pattern for an offline-first app.

**Fix:** Replace individual count queries with a single RPC or batched query that returns counts for all tables in one round-trip.

---

### 2. Fix #6 Honest: Replace "(cloud wins)" with clear language

**Evidence:** Line 514 uses "(cloud wins)" which neutralizes the destructive nature of pull operations. Users may not realize local unsynced changes will be permanently overwritten.

**Fix:** Change "Data cloud akan menimpa data lokal (cloud wins)" → "Data cloud akan menimpa data lokal — perubahan lokal yang belum di-sinkronkan akan hilang"

---

### 3. Fix #8 Thorough: Add focus-visible styling

**Evidence:** No focus-visible or focus:ring styling observed in the component. This breaks keyboard navigation accessibility.

**Fix:** Add `focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2` to interactive buttons (lines 302, 380, 536, 543).

---

### 4. Fix #4 Understandable: Replace jargon labels

**Evidence:** Lines 425 uses "(incremental)" and "(full)" which are technical terms not clear to non-technical users.

**Fix:** Replace "(incremental)" → "(perubahan saja)" and "(full)" → "(keseluruhan)" or use icons instead of text.

---

### 5. Fix #8 Thorough: Add ARIA labels to icon buttons

**Evidence:** Line 302 — close button (X) has no aria-label for screen readers.

**Fix:** Add `aria-label="Tutup modal"` to the X button.

---

## What's Working Well (Do Not Touch)

- **#2 Useful (3/3):** Modal directly supports confirmation task. Empty state prevents accidental syncs. Disabled state when nothing to sync.
- **#3 Aesthetic (2/3):** Consistent spacing, color-coded operation badges, cohesive icon set.
- **#7 Long-lasting (2/3):** Neutral design language using standard Tailwind utilities will age well.

---

## Anti-Patterns to Avoid in Refine

- Do NOT add new modal types or restructure the confirmation flow
- Do NOT change the color coding system (green/blue/red for operations)
- Do NOT remove the warning banner — it's essential for honesty
- Do NOT simplify away the table list preview — it's the core value of this modal
