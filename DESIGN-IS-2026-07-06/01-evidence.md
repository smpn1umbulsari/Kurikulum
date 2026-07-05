# Phase 1 Evidence — Dieter Rams Design Audit

## Evidence Summary (from parallel subagent collection)

---

### Structural Evidence (Structural Agent)

**Interactive-element count:** 108 total across audited surfaces
- MainLayout: 5, AcademicTermPage: 10, GuruPage: 47, SiswaPage: 43

**Max nesting depth:** 9 levels (AcademicTermPage, GuruPage, SiswaPage)

**Repeated patterns (9 distinct):**
- Modal dialog pattern (3 files)
- Toolbar with action buttons (2 files)
- Preview modal for Excel import (2 files)
- Pagination (3 files)
- EmptyState with action (3 files)
- SkeletonRow placeholder (3 files)
- Form label+input groups (3 files)
- Form Batal/Simpan buttons (3 files)
- KPI metric cards (DashboardPage, 4 cards)
- Toast confirm (3 files)

**Dead props / unused imports:** 9 total
- 1 dead prop: `noHp` in GuruPage.tsx
- 7 unused icon imports in MainLayout.tsx (passed as JSX children to helper)
- 1 misused import: `Database` used as className source only

**Button variants:** 9 distinct variants — BUT inconsistent: `bg-primary-600` (config) vs `bg-blue-600` (Tailwind default) vs `bg-emerald-600` (Tailwind default) across different pages

**Design tokens:** Centralized in `tailwind.config.js` — BUT `blue-600` and `emerald-600` (Tailwind defaults not in config) used alongside config tokens in GuruPage and SiswaPage

---

### Visual Evidence (Visual Agent)

**Spacing scale:** 4px, 8px, 10px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px — largely 4px-based with 10px and 64px outliers

**Type scale:** 10px, 12px, 14px, 16px, 18px, 20px, 24px, 36px — 1.2 ratio, reasonable for product UI

**Distinct color count:** ~30+ unique values (10 primary + 10 neutral + 6 semantic + Tailwind defaults used outside config)

**Lowest contrast ratio:** ~4.7:1 (amber-800 on amber-100) — **BORDERLINE FAIL** for WCAG AA (requires 4.5:1 for large text, but this is small badge text). Additional failures found in accessibility evidence.

**States checklist:**
- Empty state: PRESENT (EmptyState.tsx component)
- Loading state: PRESENT (SkeletonRow + LoadingState)
- Error state: PRESENT (Zod validation + toast.error)
- Success state: PRESENT (Toast success variant + toast.success)
- Focus-visible state: **PARTIAL** — `focus:ring-2` present but no explicit `focus-visible:` classes; Tailwind default applies to all focus
- Disabled state: PRESENT (disabled:opacity-50 + disabled:cursor-not-allowed)

**Color definition:** Single source (tailwind.config.js) — no scattered inline hex values

**Border radius:** Custom system (`small:8px`, `medium:12px`, `card:16px`) BUT `rounded-xl`/`rounded-2xl`/`rounded-3xl`/`rounded-full` Tailwind defaults used alongside in GuruPage.tsx

**Shadow vocabulary:** Custom (`card`, `modal`, `floating`) BUT `shadow-2xl` used in 2 places in GuruPage.tsx

---

### Copy & Honesty Evidence (Copy Agent)

**User-facing strings:** 200+ Indonesian-first labels across all audited pages

**Inflations:** NONE — no marketing superlatives found

**Dark patterns:** NONE — confirmations are neutral, no fake scarcity

**Jargon flagged:**
- `Mapel` (GuruPage) — should spell out as "Mata Pelajaran"
- `NIP`, `NISN`, `NIPD` — need expansion on first use
- `RPE`, `HEB`, `KBM`, `SAS/SAT` — unexplained acronyms in CalendarPage
- `REAL`/`DAPO` — "REAL (Kelas Fisik/Nyata)" / "DAPO (Data Poket Pendidikan)" not defined in UI
- `Prev`/`Next` — English pagination in Indonesian context

**Language mixing:** INCONSISTENT — toolbar buttons mix Indonesian (`Tambah Guru`, `Simpan`, `Batal`) with English (`Template`, `Import`, `Reset`, `Refresh`, `Prev`, `Next`, `Upload`, `Sign In`)

**Error messages:** MIXED — Zod validation errors are actionable; generic "Gagal menyimpan" errors are not

**Non-actionable errors found:**
- GuruPage.tsx:248 — `Gagal menyimpan: ${error.message}` (no fix guidance)
- SiswaPage.tsx:177 — generic error
- LoginPage.tsx:47 — doesn't distinguish auth failure types

---

### Weight & Friction Evidence (Performance Agent)

**Initial JS bundle:** ~2-4MB+ (uncompressed)
- No code splitting configured in vite.config.ts
- Heavy deps bundled eagerly: recharts (~150KB+), xlsx (~300KB+), sweetalert2 (~60KB), lucide-react (~100KB)
- All 23 route pages bundled upfront

**Network requests:** ~5-10+ on initial load
- 1 HTML + 1 monolithic JS chunk + 1 CSS + Google Fonts CDN + Supabase init

**Time-to-interactive:** 3-8 seconds estimated
- Pure SPA (no SSR)
- SyncManager.init() runs synchronously before React renders
- No lazy loading in any route

**Animation count on idle:** 0 CSS animations active on login screen
- `toast-in` keyframes defined but inactive until triggered
- `animate-pulse` used on pending sync badge only
- No orchestrated page-load sequences

**Notification/modal on load:** 0 — ToastContainer returns null when empty

**Route-based code splitting:** NO — all routes are static imports
**Heavy deps lazy loading:** NO — all loaded eagerly
**Loading pattern:** Both skeleton rows AND spinner-based
**Animation libraries:** Pure CSS only (no framer-motion, motion, anime.js)

---

### Accessibility Evidence (Accessibility Agent)

**WCAG contrast failures:**
- SyncToolbar disabled buttons: `text-neutral-400` (#a3a3a3) on `bg-neutral-100` (#f5f5f5) = ~2.9:1 — **FAIL** (requires 4.5:1)
- EmptyState title: `text-neutral-400` on white = ~4.5:1 — **BORDERLINE**
- MainLayout nav icons: `text-neutral-400` on white = ~4.5:1 — **BORDERLINE**

**Focus order:** Logical for MainLayout (mobile menu → accessibility toggles → nav → sync → logout)

**Keyboard reachability:**
- Nav links: YES
- Toolbar buttons: YES
- Modal close buttons: **NO** focus-visible styling
- Table sort headers: **NO** keyboard handler (GuruPage.tsx:466-501)
- Form inputs: YES (when present)
- Empty state action: YES

**ARIA landmarks:** 4/7 present
- `<header>` (banner): YES
- `<nav>`: YES
- `<main>`: YES
- `<aside>`: YES
- `<footer>`: NO
- `<form>`: NO
- `<search>`: NO

**Skip link:** **NO** skip-to-content link found anywhere

**Focus-visible outlines:**
- Mobile overlay close button: YES (styled)
- All other interactive elements: **NO** explicit `focus-visible:` styling

**High Contrast mode:**
- Present but incomplete: sets `bg-black text-yellow-400 contrast-125` but focus outlines may disappear on black background

**Large Text mode:**
- Present but incomplete: scales root text from 14px→18px but doesn't scale form inputs, buttons, or other fixed-size elements

**Form label pairing:**
- AcademicTermPage: **NO** htmlFor/id on tahun_ajaran, semester, tanggal inputs (only checkbox has it)
- GuruPage: **NO** htmlFor/id on any modal inputs
- **All form inputs lack proper label associations**

**Icon-only button accessibility:**
- MainLayout logout: NO aria-label (title on SVG only)
- MainLayout Type/Eye toggles: NO aria-label (title on button only)
- Modal close buttons: NO aria-label
- SyncToolbar buttons: NO aria-label
- GuruPage inline edit icons: NO aria-label
- Toast close: **YES** aria-label

---

## Evidence Gaps

- No live URL to screenshot — all visual evidence is code-inferred
- Dashboard charts (recharts) not audited — high complexity components
- Rapor PDF generation not audited — different surface type
- Mobile responsiveness not tested — only code review
- Screen reader testing not possible without live URL
