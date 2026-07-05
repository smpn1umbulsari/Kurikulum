# MAKE-PLAN: SIKAD v4.0 — UI/UX Improvement

**Created:** 2026-07-03
**Orchestrator:** make-plan skill

---

## Primary User

Indonesian school administrators (teachers, homeroom teachers, curriculum heads, school principals) managing academic data offline-first. Users are not necessarily tech-savvy; clarity and confidence in data operations are critical.

## Primary Task

Manage academic data (students, teachers, classes, assessments, report cards) with high confidence — creating, editing, importing via Excel, and viewing summary information across 21 pages.

---

## Non-Goals (do not design these now)

- Backend API changes or Supabase schema modifications
- Authentication flow redesign
- AETHER platform CLI improvements
- New feature pages beyond the existing 21
- Mobile-native layout (responsive polish only)

---

## Reference Principles to Optimize For

1. **Consistent design language (#3 aesthetic)** — The single biggest UX problem right now is two color systems coexisting: `slate-*` (Tailwind default) in SiswaPage/GuruPage vs `neutral-*` (custom config) in AssessmentPage/KelasPage/MainLayout. Every page must use ONE system.
2. **Understandable (#4)** — Every control, label, and button must be nameable by a first-time Indonesian school administrator. Native `alert()` dialogs undermine confidence.
3. **Thorough (#8)** — No page should show bare "Memuat..." text while loading. Skeleton loaders and empty states with guidance replace raw text placeholders.
4. **Honest (#6)** — Form validation must surface field-level errors inline, not hide them behind browser alerts.

---

## PHASE 1: Design System Foundation — Shared Component Library

### 1.1 — Create `src/components/ui/` directory with these shared components

**Documentation references:** Copy patterns from existing strong examples in the codebase:
- `src/modules/siswa/pages/SiswaPage.tsx:196–212` — KPI card pattern (badge + icon + value layout)
- `src/modules/siswa/pages/SiswaPage.tsx:324–380` — modal form structure (header gradient, two-column grid, footer actions)
- `src/modules/kelas/pages/KelasPage.tsx:537–559` — KPI metric card with icon on right

**Allowed APIs:**
- `react` (existing)
- `tailwind-merge` + `clsx` (existing in package.json)
- Custom hooks must follow `use*` naming from `src/modules/*/hooks/`

**Files to create:**
| File | Purpose |
|------|---------|
| `src/components/ui/PageHeader.tsx` | Reusable header: badge chip + title + description + KPI slots |
| `src/components/ui/Modal.tsx` | Reusable modal: header with gradient, body slot, footer actions |
| `src/components/ui/Badge.tsx` | Status badge: variant prop (success/warning/danger/neutral) |
| `src/components/ui/TableToolbar.tsx` | Reusable toolbar: search + filters + action buttons slot |
| `src/components/ui/SkeletonRow.tsx` | Table skeleton loader |
| `src/components/ui/EmptyState.tsx` | Empty state with icon + message + optional action |
| `src/components/ui/Toast.tsx` | Toast notification system (replace all `alert()` calls) |

**Verification:** `grep -r "native alert" src/modules/**/*.tsx` returns zero results after Phase 3.

### 1.2 — Standardize on `neutral-*` color tokens from the custom Tailwind config

**Evidence of problem:**
- `src/modules/siswa/pages/SiswaPage.tsx` — uses `slate-*` (`bg-slate-50`, `border-slate-200`, `text-slate-900`, etc.) throughout
- `src/modules/guru/pages/GuruPage.tsx` — same `slate-*` pattern
- `src/app/layouts/MainLayout.tsx` — uses `neutral-*` from custom config
- `src/modules/kelas/pages/KelasPage.tsx` — uses `neutral-*`
- `src/modules/assessment/pages/AssessmentPage.tsx` — uses `neutral-*`
- `src/index.css:43` — `app-panel--toolbar` has hardcoded `#E5E7EB` border color (should use `neutral-*`)

**Move:** Run a mass-find-replace across all `.tsx` files:
- Replace `slate-50` → `neutral-50`
- Replace `slate-100` → `neutral-100`
- Replace `slate-200` → `neutral-200`
- Replace `slate-300` → `neutral-300`
- Replace `slate-400` → `neutral-400`
- Replace `slate-500` → `neutral-500`
- Replace `slate-600` → `neutral-600`
- Replace `slate-700` → `neutral-700`
- Replace `slate-800` → `neutral-800`
- Replace `slate-900` → `neutral-900`
- Replace `slate-950` → `neutral-950`

**Anti-pattern guards:**
- Do NOT replace `slate-50` in `tailwind.config.js` itself (those are custom palette definitions)
- Do NOT replace `slate-*` inside string literals that are database values (e.g., `status === 'slate-active'`)
- Do NOT replace inside `.md` or `.txt` documentation files
- Verify after replace: `grep -r "slate-" src/modules/ | grep -v node_modules | wc -l` returns 0

**Verification:** Every page under `src/modules/` uses only `neutral-*`, `primary-*`, `success-*`, `warning-*`, `danger-*`, `info-*` — no `slate-*`, no `gray-*`, no bare hex colors for backgrounds/text.

### 1.3 — Fix hardcoded color in `src/index.css`

**Evidence:** `src/index.css:45` — `border-bottom: 1px solid #E5E7EB` in `.app-panel--toolbar`. This is Neutral 200 in the custom palette.

**Move:** Change to `border-bottom: 1px solid var(--tw-neutral-200)` or use Tailwind class equivalent.

---

## PHASE 2: Replace All `alert()` / `confirm()` with Toast Notification System

### 2.1 — Build Toast component and Zustand store

**Evidence of problem:** Every page has raw `alert()` calls that block the browser thread and look unpolished:
- `src/modules/siswa/pages/SiswaPage.tsx:161` — `alert('Data siswa berhasil disimpan!')`
- `src/modules/siswa/pages/SiswaPage.tsx:162` — `alert('Data siswa berhasil diperbarui!')`
- `src/modules/siswa/pages/SiswaPage.tsx:170` — `alert('Siswa berhasil dihapus!')`
- `src/modules/siswa/pages/SiswaPage.tsx:431` — `alert('Import berhasil!')`
- `src/modules/guru/pages/GuruPage.tsx:259` — `alert('Data guru berhasil disimpan!')`
- `src/modules/rapor/pages/RaporPage.tsx:102` — `alert('Catatan Wali Kelas berhasil disimpan!')`
- `src/modules/kelas/pages/KelasPage.tsx:192` — `swal.error('Tahun Ajaran aktif belum ditentukan!')`
- `src/modules/kelas/pages/KelasPage.tsx:218` — `swal.confirm(...)` — this one uses SweetAlert2, others use native `confirm`

**Move:** Create `src/components/ui/Toast.tsx` and `src/store/toastStore.ts` using Zustand (already in package.json). Provide: `toast.success(msg)`, `toast.error(msg)`, `toast.warning(msg)`, `toast.info(msg)`, `toast.confirm(msg, onConfirm)`.

**Allowed patterns:**
- Use `react-hot-toast` or build with Zustand + CSS transitions — check what is already in `package.json`
- If no toast library exists, build minimal: Zustand store + portal-rendered `<div>` in App.tsx + CSS keyframe slide-in animation

**Files to change:**
- Every `alert('...')` call in `src/modules/**/*.tsx` → `toast.success('...')`
- Every `alert(\`Gagal: ${...}\`)` → `toast.error('Gagal: ' + ...)`
- Every `confirm('...?')` → `toast.confirm(...)` with onConfirm callback
- `src/modules/kelas/pages/KelasPage.tsx` already uses `swal` (SweetAlert2) — consolidate: replace `swal.error` and `swal.confirm` with the new Toast system

**Anti-pattern guards:**
- Do NOT add `alert()` back anywhere after this phase
- Do NOT keep `confirm()` dialogs for destructive actions — use a visible toast-style confirmation with explicit "Ya / Batal" buttons in the UI, not browser dialogs

**Verification:** `grep -rn "alert(" src/modules/ | grep -v "// alert" | grep -v "\/\*.*alert"` returns zero results.

---

## PHASE 3: Loading States, Empty States, Error States

### 3.1 — Add skeleton loader component and replace all "Memuat..." text

**Evidence:** Every page has a bare text loading indicator:
- `src/modules/siswa/pages/SiswaPage.tsx:283` — `<td colSpan={7} className="...">Memuat data...</td>`
- `src/modules/guru/pages/GuruPage.tsx:531` — `<td colSpan={8}>Memuat data guru...</td>`
- `src/modules/assessment/pages/AssessmentPage.tsx:377` — `<td colSpan={3}>Memuat data nilai siswa...</td>`
- `src/modules/rapor/pages/RaporPage.tsx` — no loading indicator at all for the initial fetch

**Move:** Create `src/components/ui/SkeletonRow.tsx` — renders N rows of animated gray placeholder bars matching table column widths. Replace each "Memuat..." table row with `<SkeletonRow count={5} />` where 5 is the approximate visible row count.

**Specific files to change:**
- `src/modules/siswa/pages/SiswaPage.tsx` — replace loading row with `<SkeletonRow columns={7} />`
- `src/modules/guru/pages/GuruPage.tsx` — replace loading row with `<SkeletonRow columns={8} />`
- `src/modules/assessment/pages/AssessmentPage.tsx` — replace loading row with `<SkeletonRow columns={3} />`
- `src/modules/kelas/pages/KelasPage.tsx` — add skeleton for both table and candidate/member panels

### 3.2 — Improve empty states with actionable guidance

**Evidence:** Empty states show bare text with no call to action:
- `src/modules/siswa/pages/SiswaPage.tsx:286` — "Tidak ada data siswa ditemukan" — no action suggested
- `src/modules/guru/pages/GuruPage.tsx:537` — "Tidak ada data guru ditemukan" — no action
- `src/modules/kelas/pages/KelasPage.tsx:621` — "Tidak ada kelas real di semester aktif ini" — no action
- `src/modules/rapor/pages/RaporPage.tsx:202` — "Tidak ada data siswa ditemukan" — no action

**Move:** Create `src/components/ui/EmptyState.tsx` with slots: `icon`, `title`, `description`, `action`. Replace each empty `<tr>` with `<EmptyState icon={Plus} title="Tidak ada data" description="Tambahkan data pertama dengan tombol di atas." action={<Button>...</Button>} />`.

**Files to change:** Same as 3.1, plus `src/modules/rapor/pages/RaporPage.tsx`.

### 3.3 — Add error boundary and per-query error states

**Evidence:** `src/modules/assessment/pages/AssessmentPage.tsx` — `useAssessmentDetails` may error but there is no error state UI. No page has a dedicated error state.

**Move:** Wrap each page's `<main>` content in `src/app/layouts/MainLayout.tsx` with a lightweight error boundary. On error, show: icon + "Terjadi kesalahan" + "Coba refresh halaman" button.

---

## PHASE 4: Form UX — Field-Level Validation and Submission

### 4.1 — Migrate all pages to use `react-hook-form` + `zod` (already in package.json)

**Evidence:** Three pages already use react-hook-form + zod correctly:
- `src/modules/assessment/pages/AssessmentPage.tsx:14–21` — Zod schema with field-level error messages
- `src/modules/kelas/pages/KelasPage.tsx:29–37` — Zod schema with meaningful error messages

Three pages use raw `useState` with `onSubmit` `e.preventDefault()` + `alert()` validation:
- `src/modules/siswa/pages/SiswaPage.tsx:143–164` — validates with `if (!nama.trim()) { alert('...'); return; }`
- `src/modules/guru/pages/GuruPage.tsx:227–265` — same pattern with `alert()` for validation
- `src/modules/auth/pages/LoginPage.tsx` — same pattern

**Move:** Refactor SiswaPage and GuruPage to use `useForm<ZodSchema>` pattern matching AssessmentPage. Keep zod schemas. Replace:
- `if (!field) { alert('...'); return; }` → zod `.refine()` or `.min()` in schema
- `onSubmit` handler should NOT call `alert()` — use toast from Phase 2

**Allowed APIs:** `react-hook-form` (existing), `@hookform/resolvers/zod` (existing in package.json), `zod` (existing)

### 4.2 — Auto-focus first invalid field on submit

**Evidence:** `src/modules/assessment/pages/AssessmentPage.tsx` — react-hook-form is set up but `autoFocus` is not used on invalid fields.

**Move:** Add `autoFocus` to the first input element in each form. When zod validation fails, the browser naturally focuses the first `:invalid` element if `focus()` is called on `formRef.current`. Pattern: in `handleSubmit`, call `formRef.current?.querySelector('[data-invalid]')?.focus()`.

### 4.3 — Prevent double-submit during mutation `isPending`

**Evidence:** `src/modules/siswa/pages/SiswaPage.tsx:372` — `disabled={saveSiswaMutation.isPending}` is correctly set on the submit button. Check and fix for all pages that may be missing this.

**Verification:** `grep -rn "type=\"submit\"" src/modules/ | xargs grep "disabled=" | grep -v "isPending"` — all submit buttons must have `disabled={mutation.isPending}`.

---

## PHASE 5: Accessibility — WCAG AA Baseline

### 5.1 — Add `aria-label` to all icon-only buttons

**Evidence:** Every page has icon-only buttons with no accessible label:
- `src/modules/siswa/pages/SiswaPage.tsx:301` — `<button ... title="Edit"><Eye className="h-4 w-4" /></button>` — `title` is present but `aria-label` is the proper ARIA attribute
- `src/modules/guru/pages/GuruPage.tsx:634` — same pattern
- `src/modules/rapor/pages/RaporPage.tsx:240` — same pattern

**Move:** Replace all `title="..."` on `<button>` elements with `aria-label="..."`. Title attribute is deprecated for accessibility on interactive elements; `aria-label` is the correct attribute.

**Specific files:** All `src/modules/**/*.tsx` files.

### 5.2 — Add `role="status"` or `aria-live` to dynamic content regions

**Evidence:** Toast notifications and table row additions are dynamically rendered but have no ARIA live region announcement.

**Move:** Add `aria-live="polite"` to the toast container. Add `aria-live="polite"` to the table `<tbody>` or a specific status row that announces "Data berhasil disimpan."

### 5.3 — Verify color contrast on all text

**Evidence:** The custom `primary-*` palette in `tailwind.config.js` defines `primary-700: '#1E40AF'` and `primary-600: '#1D4ED8'`. WCAG AA requires 4.5:1 for normal text and 3:1 for large text.

**Quick check (INFERRED):** `primary-50 (#EEF4FF)` on white (`#F9FAFB`) may fail contrast. Test: calculate contrast ratios for:
- `primary-600` text on white background → passes (blue on white)
- `primary-50` background with `primary-700` text → passes
- `neutral-400` (#9CA3AF) text on white → may fail (4.5:1 threshold). All `text-neutral-400` uses must be checked.

**Move:** Replace any `text-neutral-400` or `text-neutral-500` used as body text with `text-neutral-600` or darker. Use `text-neutral-500` only for secondary labels, captions, and helper text (where WCAG allows 3:1 for large/secondary text).

### 5.4 — Add `prefers-reduced-motion` support

**Evidence:** `src/index.css` has no `@media (prefers-reduced-motion)` query. Tailwind's `animate-spin`, `animate-pulse` classes run regardless of OS settings.

**Move:** Add to `src/index.css`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 5.5 — Keyboard navigation for data tables

**Evidence:** `src/modules/assessment/pages/AssessmentPage.tsx:124–140` — ArrowUp/ArrowDown keyboard navigation exists for the score input grid. No other tables have keyboard navigation.

**Move:** Add `tabIndex={0}` to table rows and `onKeyDown` handlers to support Enter-to-edit and Escape-to-cancel for the edit action columns. This is a progressive enhancement — screen reader users benefit from `aria-selected` on selected rows.

---

## PHASE 6: Navigation & Wayfinding

### 6.1 — Add page breadcrumb trail

**Evidence:** `src/app/layouts/MainLayout.tsx:190` — `{getPageTitle()}` renders only the current page name in the toolbar. No breadcrumb path.

**Move:** Add a `Breadcrumb` component to the toolbar area. For each route, derive the path: `/siswa` → "Home / Data Siswa". Display as: `<span class="text-neutral-400">/</span>` between segments. Link each segment to its route except the last.

### 6.2 — Add "last updated" timestamp to page headers

**Evidence:** No page shows when data was last loaded/refreshed. Users don't know if they're looking at fresh data.

**Move:** In the PageHeader component created in Phase 1.1, add a `subtitle` slot. After each data fetch (in `onSuccess` callback of React Query mutations), update a `lastUpdated` state and display "Diperbarui: 5 menit yang lalu" in the header.

---

## PHASE 7: Responsive Polish (Low Priority)

### 7.1 — Audit mobile breakpoints

**Evidence:** `src/app/layouts/MainLayout.tsx` has `md:flex` on sidebar (hides on mobile) and `md:hidden` on hamburger menu button. No other pages have mobile-specific layouts.

**Move:**
- Tables in SiswaPage, GuruPage, AssessmentPage use `overflow-x-auto` — this is correct. Confirm they scroll horizontally on small screens.
- KPI card grids use `grid-cols-2 lg:grid-cols-4` — mobile shows 2 columns, tablet 4. This is acceptable.
- Modal forms use `max-w-2xl` — confirm they don't overflow on small screens. If needed, change `max-w-2xl` to `max-w-lg sm:max-w-2xl`.

### 7.2 — Improve pagination controls

**Evidence:** `src/modules/siswa/pages/SiswaPage.tsx:314–319` — "Prev" and "Next" buttons with no page number display. `src/modules/guru/pages/GuruPage.tsx:672–685` — same.

**Move:** Show "Halaman N dari Total" between Prev/Next buttons. Add direct page number buttons (1, 2, 3, ...) if total pages > 3.

---

## Implementation Order

| Phase | Priority | Reason |
|-------|----------|--------|
| Phase 1.2 | 1st | Color system inconsistency is the most visible broken thing |
| Phase 1.1 | 2nd | Shared components enable all later phases |
| Phase 2 | 3rd | alert() replacement touches every page — do before form work |
| Phase 4 | 4th | Form UX after toast system is in place |
| Phase 3 | 5th | Loading/empty/error states after components exist |
| Phase 5 | 6th | Accessibility — affects screen reader users |
| Phase 6 | 7th | Navigation improvements — icing on the cake |
| Phase 7 | 8th | Responsive polish — last priority |

---

## Anti-Patterns to Guard Against

- **Do NOT invent new color tokens** — use only the existing custom palette in `tailwind.config.js` (primary, neutral, success, warning, danger, info)
- **Do NOT add new packages** beyond what is already in `package.json` unless absolutely necessary
- **Do NOT change the data layer** — repositories, Dexie schema, Supabase queries are out of scope
- **Do NOT create one-off components** — every new component must go into `src/components/ui/` and be used in ≥2 pages to justify its existence
- **Do NOT skip the verification step** — each phase ends with a `grep` or manual check confirming the old pattern is gone
- **Do NOT mix design systems** — after Phase 1.2, every file must use only `neutral-*`, never `slate-*` or `gray-*`
