# 01-evidence.md — Sync Validation Modal Audit Evidence

## Visual Evidence (from subagent)

**Spacing scale:** py-4, py-3, py-2, py-12, px-6, px-4, mt-4, mt-1, mt-0.5, mb-3, mb-1, mb-4, gap-3, gap-2, gap-1, gap-0.5, space-y-2, space-y-0.5, mx-4, mx-6, inset-0

**Type scale:** text-[10px], text-xs, text-sm, text-lg

**Color count:** 18 distinct color tokens
- neutral: bg-neutral-50, bg-neutral-100, bg-neutral-200, text-neutral-400, text-neutral-500, text-neutral-600, text-neutral-700, text-neutral-800, border-neutral-100, border-neutral-200, border-neutral-300
- primary: bg-primary-50, bg-primary-100, bg-primary-200, text-primary-600, text-primary-700, bg-primary-600, bg-primary-700
- blue: bg-blue-50, bg-blue-100, text-blue-700, text-blue-800, border-blue-200, text-blue-600, bg-blue-600, bg-blue-700
- amber: bg-amber-50, border-amber-200, text-amber-800, text-amber-600
- red: text-red-500, bg-red-100, text-red-700
- green: text-green-400, bg-green-100, text-green-700
- purple: bg-purple-100, text-purple-700
- white/black: bg-white, text-white, bg-black/50

**Contrast concern:** Yes — bg-neutral-100 on text-neutral-500 at lines 395-397 has low contrast for secondary text. bg-neutral-50 on text-neutral-600 at line 349 may also be marginal.

**States checklist:**
- empty: present (lines 348-359 - "Tidak ada data" empty state)
- loading: present (lines 338-342 - Loader2 spinner with "Memuat preview data...")
- error: present (lines 343-347 - red AlertTriangle with error message)
- success: present (lines 350-351 - green CheckCircle for empty/synced success)
- focus: **missing** (no explicit focus-visible or focus:ring styling observed)
- disabled: present (lines 304-305, 538-539, 545 - disabled state with opacity-50)

---

## Structural Evidence (manual audit)

**Interactive elements:**
1. Close button (X) - line 302-308
2. Expandable table buttons (multiple, dynamic) - line 380-432
3. Batal button - line 536-542
4. Confirm button (sinkron/tarik) - line 543-566
5. Backdrop click area - line 270-273

**Max nesting depth:** 5 levels
- div (modal container)
  - div (header)
    - div (header content)
      - div (icon + text)
        - h3 (title)
  - div (content area)
    - div (table list)
      - div (table item)
        - button (expandable)
          - div (details)
            - div (item detail rows)

**Repeated patterns:**
- Operation type badges (INSERT/UPDATE/DELETE) - appears in header and expanded details (lines 403-416, 449-457)
- Color coding for operations (green=INSERT, blue=UPDATE, red=DELETE)
- Expandable sections with chevron icons

**Unused imports:** None detected - all 8 lucide icons are used

---

## Copy & Honesty Evidence (from subagent)

**User-facing strings:**
1. "Konfirmasi Sinkronisasi" - line 293
2. "Konfirmasi Tarik Data" - line 293
3. "Data berikut akan dikirim ke cloud (Supabase)" - line 297
4. "Data terbaru akan ditarik dari cloud ke perangkat ini" - line 298
5. "Tindakan ini akan mengubah data di server cloud" - line 324
6. "Data lokal akan ditimpa dengan data dari cloud" - line 325
7. "Pastikan Anda yakin dengan perubahan yang akan disinkronkan. Data yang sudah ada di cloud mungkin akan diperbarui." - line 329
8. "Pastikan tidak ada perubahan lokal yang belum disinkronkan. Semua data lokal akan diganti dengan data terbaru dari server." - line 330
9. "Memuat preview data..." - line 341
10. "Tidak ada data yang perlu disinkronkan" - line 352
11. "Tidak ada data baru dari cloud" - line 352
12. "Semua data sudah tersinkron dengan server" - line 356
13. "Data di perangkat ini sudah yang terbaru" - line 357
14. "Tabel yang akan disinkronkan:" - line 365
15. "Tabel yang akan ditarik:" - line 365
16. "perubahan" - line 368
17. "catatan" - line 368
18. "(incremental)" - line 425
19. "(full)" - line 425
20. "Akan menarik data yang berubah sejak:" - line 485
21. "Akan menarik seluruh data dari tabel ini" - line 486
22. "catatan akan ditimpa ke data lokal" - line 492
23. "Informasi:" - line 505
24. "Data akan dikirim ke server Supabase" - line 508
25. "Jika data sudah ada di cloud, akan dilakukan update" - line 509
26. "Gagal sync akan dicoba lagi secara otomatis (max 3x)" - line 510
27. "Data cloud akan menimpa data lokal (cloud wins)" - line 514
28. "Data yang belum di-sinkronkan akan hilang jika ada di cloud" - line 515
29. "Sinkronkan terlebih dahulu jika ada perubahan lokal" - line 516
30. "Terakhir sync:" - line 530
31. "Terakhir tarik:" - line 531
32. "Belum pernah" - line 530, 531
33. "Batal" - line 541
34. "Menyinkronkan..." - line 555
35. "Menarik Data..." - line 555
36. "Ya, Sinkronkan ${totalCount} Data" - line 561
37. "Ya, Tarik ${totalCount} Data" - line 562
38. "item lainnya" - line 474

**Inflations:** none

**Dark patterns:**
- Line 514: "(cloud wins)" in info box minimizes the destructive nature of pull operation — users may not realize local data is being deliberately overwritten with a neutral/positive framing

**Jargon/unclear labels:**
- "(incremental)" → proposed: "(perubahan saja)" - line 425
- "(full)" → proposed: "(keseluruhan)" - line 425
- "cloud wins" → proposed: "data lokal akan ditimpa" - line 514

**Label→behavior mismatches:**
- "cloud wins" (line 514) is informational text, not a button label, but creates ambiguity about conflict resolution behavior
- Button "Batal" (Cancel, line 541) closes the modal rather than canceling a pending operation — functionally correct but label implies action-undo when no action is pending

---

## Weight & Friction Evidence (from subagent)

**JS impact:** ~5-15 KB (lucide-react: 12 icons including X, Upload, Download, AlertTriangle, Info, CheckCircle, Clock, Database, RefreshCcw, ChevronDown, ChevronRight, Loader2; plus react hooks, dexie db, supabase client, zustand store)

**Additional API calls on open:**
- **tarik mode**: 17 Supabase count queries (one per table in SUPABASE_TABLE_MAP: academic_terms, gurus, siswas, kelas, mata_pelajarans, pembagian_mengajar, assessments, assessment_details, catatan_wali_kelas, rapor_snapshots, tugas_tambahan_assignments, calendar_events, academic_calendar_events, exam_rooms, exam_seats, exam_supervisors, rombel_bayangans)
- **sinkron mode**: 0 API calls (reads local IndexedDB only via dexie db.syncQueue)

**Animation count:** 2
- 2 CSS `animate-spin` on Loader2 (loading preview state + confirm button loading state)
- Multiple CSS `transition-colors` on buttons (lightweight transitions)
- 1 `backdrop-blur-sm` on modal backdrop

**Notifications triggered:**
- Modal component itself: **0 direct notifications**
- On confirm (handled by SyncToolbar):
  - `toast.warning('Tidak ada koneksi internet')` - if offline
  - `toast.success('{n} data berhasil disinkronkan ke cloud')` - on successful sync
  - `toast.info('Semua data sudah sinkron')` - no pending items
  - `toast.error('{n} data gagal disinkronkan')` - on failure
  - `toast.warning('{n} konflik ditemukan...')` - on conflicts
  - `toast.success('{n} data berhasil ditarik dari cloud')` - on pull success
  - `toast.warning('{n} tabel gagal ditarik dari cloud')` - on pull errors
  - `toast.info('Tidak ada data baru dari cloud')` - no new data

---

## Accessibility Evidence

**Focus management:** Modal does not trap focus (no focus trap implementation)
**Keyboard navigation:** Buttons are keyboard-accessible but tab order is not explicitly managed
**ARIA:** No ARIA labels on icon-only buttons (X close button at line 302)
**Screen reader:** Missing aria-live for dynamic content loading states

---

## Summary of Key Findings

| Principle | Evidence | Risk Level |
|-----------|----------|------------|
| #6 Honest | "(cloud wins)" framing is ambiguous | Medium |
| #8 Thorough | No focus-visible styling | Medium |
| #4 Understandable | "(incremental)" / "(full)" jargon | Low |
| #9 Eco-friendly | 17 API calls on modal open (tarik mode) | High |
