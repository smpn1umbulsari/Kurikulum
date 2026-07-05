# 04-handoff-prompt.md — /make-plan Prompt for Refine

/make-plan Refine Sync Validation Modal (`src/components/sync/SyncValidationModal.tsx`) based on a Dieter Rams design audit (total **19/30**).

---

## Verdict paragraph

> Total score is 19/30 — below the 20 threshold but no principle scored 0. The component is functionally sound (primary task support scored 3/3) and honest in intent, but has high-priority optimization issues (17 API calls on open) and minor accessibility gaps. The problems are fixable without structural redesign.

---

## Keep (already strong, do NOT touch in this pass)

- **#2 Useful scored 3/3** — Evidence: lines 352, 545 (empty state + disabled when nothing to sync). Regression check: verify empty state shows when `previewData.length === 0` and confirm button is disabled when `totalCount === 0`.
- **#3 Aesthetic scored 2/3** — Evidence: lines 278-279, 403-416 (consistent spacing, color-coded operation badges). Regression check: verify green/blue/red color coding for INSERT/UPDATE/DELETE remains consistent.
- **#7 Long-lasting scored 2/3** — Evidence: standard Tailwind utilities used throughout. Regression check: no trendy CSS features added.

---

## Fix in priority order

### 1. Principle #9 — Eco-friendly: Reduce API calls from 17 to 1

**Specific move:** Replace the loop of 17 individual Supabase count queries (lines 171-205) with a single RPC or batched query that returns counts for all tables in one network round-trip.

**Evidence:** Lines 171-205 in `src/components/sync/SyncValidationModal.tsx`:
```tsx
for (const dexieTable of tables) {
  const supabaseTable = SUPABASE_TABLE_MAP[dexieTable];
  // 17 separate queries — one per table
  const { count, error: countError } = await query;
  // ...
}
```

**Verification:** Open modal in "tarik" mode → verify Network tab shows 1 request instead of 17.

---

### 2. Principle #6 — Honest: Replace "(cloud wins)" with clear language

**Specific move:** Change info box text from "Data cloud akan menimpa data lokal (cloud wins)" to "Data cloud akan menimpa data lokal — perubahan lokal yang belum di-sinkronkan akan hilang"

**Evidence:** Line 514 in `src/components/sync/SyncValidationModal.tsx`:
```tsx
<li>Data cloud akan menimpa data lokal (cloud wins)</li>
```

**Verification:** Open modal in "tarik" mode → verify info box clearly warns about permanent data loss.

---

### 3. Principle #8 — Thorough: Add focus-visible styling

**Specific move:** Add `focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2` to all interactive buttons (close X, expandable table headers, Batal, Confirm).

**Evidence:** No focus styling found in component. Buttons at lines 302, 380, 536, 543 lack focus-visible.

**Verification:** Tab through modal with keyboard → verify all buttons show visible focus ring.

---

### 4. Principle #4 — Understandable: Replace jargon labels

**Specific move:** Replace "(incremental)" → "(perubahan saja)" and "(full)" → "(keseluruhan)" at line 425.

**Evidence:** Line 425 in `src/components/sync/SyncValidationModal.tsx`:
```tsx
{preview.recordCount} {preview.hasDeltaSync ? '(incremental)' : '(full)'}
```

**Verification:** Open modal in "tarik" mode → verify all users can understand what incremental vs full means (or use icons instead).

---

### 5. Principle #8 — Thorough: Add ARIA labels to icon buttons

**Specific move:** Add `aria-label="Tutup modal"` to the X close button at line 302.

**Evidence:** Line 302 has icon-only button without ARIA:
```tsx
<button onClick={onClose} disabled={isLoading}>
  <X className="h-5 w-5" />
</button>
```

**Verification:** Use screen reader to navigate modal → verify close button announces "Tutup modal".

---

## Out of scope for this refine pass

- Do NOT restructure the modal layout (header → warning → content → footer is working)
- Do NOT remove the expandable table details — this is the core value of showing preview
- Do NOT change the color coding system (green/blue/red is clear and consistent)
- Do NOT add new confirmation types or multi-step flows

---

## Deliverables for the plan

1. **Per-fix specifications:**
   - Fix #1: Create Supabase RPC function or modify loadTarikPreview() to batch queries
   - Fix #2: Update info box copy in both sinkron and tarik modes
   - Fix #3: Add focus-visible utility classes to button components
   - Fix #4: Update label text or replace with icon-based indicators
   - Fix #5: Add aria-label to icon-only close button

2. **Consolidated token/spec changes:** List all CSS class additions/modifications

3. **Regression checklist for "Keep" items:**
   - [ ] Empty state still shows when no data to sync/pull
   - [ ] Confirm button disabled when totalCount === 0
   - [ ] Operation badges (INSERT/UPDATE/DELETE) still color-coded correctly
   - [ ] Warning banner still appears for both modes

---

## Anti-patterns to guard against (specific to REFINE)

- Adding new abstractions where a direct change suffices (e.g., creating a Button component when adding classes is enough)
- Restyling areas that already scored well (aesthetic is 2/3 — don't touch spacing/color system)
- Scope creep into structural redesign (modal structure works — don't change header/content/footer layout)
- Letting fixes mutate principles outside the priority list (focus on #9, #6, #8 only)
