# Phase 2 Scorecard — Dieter Rams Design Audit

**Total Score: 14/30**

---

## 1. Good design is innovative — Score: 1/3

**Evidence:** 9 repeated patterns identified (modal, toolbar, pagination, empty state, skeleton, form groups, Batal/Simpan buttons, KPI cards, toast confirm) — all are industry-standard CRUD patterns. No unique interaction language observed. The dual-layer REAL/DAPO data model is a domain innovation, not a UI innovation.

**Justification:** Standard admin dashboard patterns with no novel interactions. Score 1 because there's minor structure (clean sidebar, consistent table layout) but no distinctive UI innovation.

---

## 2. Good design makes a product useful — Score: 2/3

**Evidence:**
- Primary task supported: CRUD operations work, tables are scannable, forms have Zod validation
- BUT: Table sort headers have no keyboard handler (`GuruPage.tsx:466-501` — `onClick` only, no `onKeyDown`)
- BUT: All form inputs lack `htmlFor`/`id` pairing (`AcademicTermPage.tsx:213-260`, `GuruPage.tsx:715-847`) — screen reader users cannot associate labels with inputs
- BUT: Modal close buttons lack `focus-visible` styling (`GuruPage.tsx:697-702`)

**Justification:** Tasks complete for mouse users, but accessibility gaps create friction for keyboard/screen reader users. Score 2 — primary task completes with accessibility detours.

---

## 3. Good design is aesthetic — Score: 1/3

**Evidence:**
- 9 button variants with inconsistent color tokens: `bg-primary-600` (config) vs `bg-blue-600` (Tailwind default, GuruPage) vs `bg-emerald-600` (Tailwind default, SiswaPage)
- Border radius: custom `small/medium/card` tokens coexist with `rounded-xl/2xl/3xl/full` Tailwind defaults across files
- Shadow: custom `card/modal/floating` tokens coexist with `shadow-2xl` in GuruPage.tsx:680,887
- Icon-only logout button with no text label (`MainLayout.tsx:173`) — visual ambiguity
- KPI cards use `rounded-card` (16px) but form inputs use `rounded-medium` (12px) — no unified surface language

**Justification:** 3+ visual system violations. Score 1 — multiple inconsistent patterns with no unified visual language.

---

## 4. Good design makes a product understandable — Score: 1/3

**Evidence:**
- Jargon without definitions: `RPE`, `HEB`, `KBM`, `SAS/SAT` in CalendarPage; `NIP`, `NISN`, `NIPD` without expansion; `REAL`/`DAPO` not explained in UI
- Language mixing: toolbar buttons mix Indonesian (`Tambah Guru`, `Simpan`, `Batal`) with English (`Template`, `Import`, `Reset`, `Refresh`, `Prev`, `Next`) on the same surface
- `Prev`/`Next` English pagination in Indonesian "Halaman X dari Y" context (GuruPage.tsx:663-670, SiswaPage.tsx:340-342)
- `Mapel` label (GuruPage.tsx:500) without "Mata Pelajaran" expansion

**Justification:** First-time Indonesian school staff will encounter unexplained acronyms and mixed-language UI. Score 1 — 2+ controls unclear plus jargon present.

---

## 5. Good design is unobtrusive — Score: 2/3

**Evidence:**
- No decorative gradients or heavy shadows — clean sidebar, readable tables
- `animate-pulse` on sync badge is the only idle animation
- No orchestrated page-load sequences
- Content is the figure, UI is the ground in most places

**Justification:** Chrome is visible but quiet. Score 2 — minimal decoration, functional motion only.

---

## 6. Good design is honest — Score: 2/3

**Evidence:**
- No marketing superlatives found
- No dark patterns (confirmations are neutral)
- Every button label maps to its behavior: "Hapus" deletes, "Aktif" activates
- Gap: generic "Gagal menyimpan" errors don't explain how to fix (`GuruPage.tsx:248`, `SiswaPage.tsx:177`, `LoginPage.tsx:47`)
- `Dashboard Kepsek` abbreviation vs full `Dashboard Kepala Sekolah` — minor label inflation

**Justification:** Claims and labels map 1:1 to behavior except for generic error messages. Score 2 — ≤1 minor inflation.

---

## 7. Good design is long-lasting — Score: 2/3

**Evidence:**
- Clean aesthetic: Inter font, neutral grays, minimal blue accent — classic admin palette
- No skeuomorphism, no heavy gradients, no trendy rounded-3xl cards throughout
- Flat-by-default design with subtle shadows
- No obvious trend markers (glassmorphism, gradient text, etc.)
- Minor dated marker: English "Prev"/"Next" pagination in Indonesian UI

**Justification:** Classic admin dashboard aesthetic. Score 2 — 1 minor dated marker.

---

## 8. Good design is thorough down to the last detail — Score: 1/3

**Evidence:**
- Empty/loading/error/success states: ALL PRESENT
- Focus-visible: PARTIAL — `focus:ring-2` present but no explicit `focus-visible:` classes
- Disabled state: PRESENT (`disabled:opacity-50`)
- BUT: No skip-to-content link anywhere
- BUT: ARIA landmarks incomplete (4/7 — missing `<form>`, `<search>`, `<footer>`)
- BUT: All form inputs lack proper `htmlFor`/`id` pairing (accessibility agent findings)
- BUT: Modal focus not trapped — Tab reaches background content
- BUT: High Contrast mode may hide focus outlines (black bg + no explicit focus-visible ring)
- BUT: Large Text mode doesn't scale form inputs/buttons proportionally

**Justification:** 3+ states are present but rough/missing. Score 1 — missing key accessibility foundations (skip link, form labels, focus management).

---

## 9. Good design is environmentally friendly — Score: 1/3

**Evidence:**
- Animation count on idle: 0 CSS animations active
- Motion is minimal: `animate-pulse` on badge only
- BUT: No `@media (prefers-reduced-motion)` found in codebase — motion not gated
- Bundle size: ~2-4MB+ (no code splitting) — engineering concern, not design
- No dark mode ignored (light-first, appropriate for school environment)

**Justification:** No idle animation, motion is functional. But no reduced-motion respect. Score 1 — motion present but not gated.

---

## 10. Good design is as little design as possible — Score: 1/3

**Evidence:**
- 9 distinct repeated patterns across files (modal, toolbar, pagination, empty state, skeleton, form groups, Batal/Simpan, KPI, toast)
- 9 button variants across pages
- 7 unused icon imports in MainLayout (passed as children, still imported)
- 1 dead prop (`noHp`) in GuruPage
- Toolbar has 5 action buttons in GuruPage (Tambah, Template, Import, Reset, Refresh) — could consolidate

**Justification:** Clear opportunities to consolidate repeated patterns into shared components. Score 1 — 3+ removable elements.

---

## Summary

| # | Principle | Score | Evidence Anchor |
|---|-----------|-------|-----------------|
| 1 | Innovative | 1/3 | 9 repeated standard CRUD patterns |
| 2 | Useful | 2/3 | Tasks work; keyboard/screen reader gaps |
| 3 | Aesthetic | 1/3 | 3+ visual system violations (inconsistent colors, radii, shadows) |
| 4 | Understandable | 1/3 | Unexplained jargon, language mixing |
| 5 | Unobtrusive | 2/3 | Chrome quiet, minimal motion |
| 6 | Honest | 2/3 | Labels match behavior; generic errors are gap |
| 7 | Long-lasting | 2/3 | Classic admin palette; 1 minor dated marker |
| 8 | Thorough | 1/3 | Missing skip link, form labels, focus management |
| 9 | Environmentally friendly | 1/3 | No reduced-motion gating |
| 10 | As little design as possible | 1/3 | 3+ removable elements, repeated patterns |
| **TOTAL** | | **14/30** | |
