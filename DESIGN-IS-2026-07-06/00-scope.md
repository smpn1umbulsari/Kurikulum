# Design Audit Scope — 2026-07-06

## What Was Audited

**Surfaces:**
- `src/app/layouts/MainLayout.tsx` — primary authenticated shell
- `src/modules/academic-term/pages/AcademicTermPage.tsx` — data entry page
- `src/modules/guru/pages/GuruPage.tsx` — complex CRUD page (47 interactive elements)
- `src/modules/siswa/pages/SiswaPage.tsx` — complex CRUD page
- `src/modules/calendar/pages/CalendarPage.tsx` — calendar/activity page
- `src/modules/kelas/pages/KelasPage.tsx` — class management
- `src/components/ui/EmptyState.tsx`, `Toast.tsx`, `SkeletonRow.tsx`, `SyncToolbar.tsx`
- `tailwind.config.js` — design token source
- Login page (`src/modules/auth/pages/LoginPage.tsx`)

**Not audited:** Dashboard charts (recharts components), report export pages, rapor PDF generation

## Primary User

Indonesian school administrative staff: Kurikulum coordinator, teachers, Kepala Sekolah.
- High cognitive load during academic year (grading periods, exam scheduling)
- Mix of tech-savvy and tech-averse users
- Senior teachers may have vision impairment

## Primary Task

1. Input and manage academic data (teachers, students, classes)
2. View and print report cards
3. Schedule exams and manage seating
4. Track attendance and calculate effective weeks

## Constraints

- **No performance regression** — user explicitly demanded design improvements without reducing performance. Admin tool, not landing page.
- Offline-first architecture (IndexedDB + Supabase sync)
- WCAG 2.1 AA accessibility target (stated in PRODUCT.md)
- Light-mode first (school environment, daylight usage)
- Must support High Contrast and Large Font modes

## Reference Designs / Competitors

- Notion (clean, minimal chrome)
- Supabase Studio (data-dense, professional)
- Dapodik Web (current Indonesian school system — low UX bar)

## Audit Methodology

- Static code analysis (no live URL available)
- Pattern: Read source → infer visual → report evidence → score
- Evidence sourced from: component files, tailwind config, routing config
