# Phase 4 Handoff — /make-plan Prompt

---

## REDESIGN

/make-plan Redesign the SIKAD v4.0 component and design system layer. Current design failed audit at 14/30 with critical gaps in principles #3 (aesthetic), #4 (understandable), #8 (thorough), #9 (environmentally friendly), and #10 (as little design as possible). The foundation is solid (clean sidebar, readable tables, Indonesian-first copy, accessibility toggles), but the execution layer lacks component abstraction, design token discipline, and accessibility infrastructure.

**Verdict paragraph:**
> The codebase has a solid foundation (clean sidebar, readable tables, accessibility toggles, Indonesian-first copy) but suffers from three structural deficiencies: no component abstraction (9 repeated patterns with inline Tailwind classes), no design token discipline (pages mix config tokens with raw Tailwind defaults), and no accessibility infrastructure (missing form labels, skip link, aria labels, focus management). These cascade across every design principle, scoring 14/30 total.

---

## Preserve from Current Design (MUST be non-empty)

- **Brand color palette** (`tailwind.config.js:9-50`) — `primary-500` (#356EFF), `neutral-50-900`, semantic colors. These work well and are already in DESIGN.md.
- **Typography** — Inter font family, 1.2 ratio type scale (10px→36px). No changes needed.
- **Spacing system** — 4px-based grid in tailwind.config.js. No changes needed.
- **Sidebar navigation structure** (`MainLayout.tsx:92-129`) — logical section grouping (Umum, Master Sekolah, Data Akademik, Kurikulum, Arsip & Pengaturan). Keep this IA.
- **Accessibility toggle controls** (`MainLayout.tsx:199-213`) — Large Text and High Contrast buttons are a good feature; refine implementation, don't remove.
- **Language** — Indonesian-first copy is correct for this user base. Keep.

---

## Discard (MUST be non-empty — structural patterns causing failures)

- **Inline Tailwind pattern** — Raw `<button>`, `<input>`, `<select>` with repeated inline class strings in every page file. Evidence: AcademicTermPage.tsx:214-289 (form inputs), GuruPage.tsx:364-870 (CRUD), SiswaPage.tsx:232-399 (CRUD). Caused failure on principle #10 (no shared components) and principle #3 (visual inconsistencies across pages).
- **Mixed design token usage** — Pages using raw Tailwind colors (`bg-blue-600` in GuruPage.tsx, `bg-emerald-600` in SiswaPage.tsx) alongside config tokens. Evidence: GuruPage.tsx:327,366,421,686,723; SiswaPage.tsx uses emerald-500/600. Caused failure on principle #3 (no unified visual system).
- **Mixed border-radius and shadow usage** — `rounded-xl/2xl/3xl` and `shadow-2xl` Tailwind defaults used alongside custom `rounded-card`/`shadow-modal` tokens. Evidence: GuruPage.tsx:336-1080 (widespread rounded-xl), GuruPage.tsx:680,887 (shadow-2xl). Caused failure on principle #3.
- **No `aria-label` on icon-only buttons** — Icon buttons with `title` but no `aria-label`. Evidence: MainLayout.tsx:173 (logout), GuruPage.tsx:625,632,639 (table actions), SyncToolbar.tsx:84,108. Caused failure on principle #8 (accessibility).
- **Form inputs without `htmlFor`/`id`** — Labels not associated with inputs. Evidence: AcademicTermPage.tsx:213-260 (no id on tahun_ajaran, semester, tanggal inputs), GuruPage.tsx:715-847 (no id on any modal input). Caused failure on principle #8 (accessibility).

---

## Top 3–5 Moves (verbatim from audit)

1. **Design token enforcement**: Audit every page — replace `blue-600`, `emerald-600`, `rounded-xl/2xl/3xl`, `shadow-2xl` with config tokens (`primary-600`, `rounded-medium`, `shadow-card`). Add ESLint rule or design system comment guard to prevent raw Tailwind defaults. Evidence: GuruPage.tsx uses `bg-blue-600` (not in config) alongside `bg-primary-600` (in config); SiswaPage.tsx uses `bg-emerald-600` (not in config).

2. **Shared component library**: Extract 9 repeated patterns into reusable components: `<Button>`, `<Input>`, `<Select>`, `<FormField>`, `<Modal>`, `<DataTable>`, `<Pagination>`, `<Toolbar>`, `<KpiCard>`. Each ships with default/hover/focus/active/disabled/loading/error states. Evidence: 108 interactive elements across 3 pages, 9 button variants, identical modal structure in AcademicTermPage, GuruPage, SiswaPage.

3. **Accessibility foundations**: Add skip-to-content link. Add `htmlFor`/`id` to all form inputs. Add `aria-label` to all icon-only buttons. Add explicit `focus-visible:` styles for keyboard navigation. Implement modal focus trap. Gate motion with `@media (prefers-reduced-motion)`. Ensure High Contrast mode preserves focus outlines. Evidence: SyncToolbar disabled text fails WCAG AA at ~2.9:1; 0/3 ARIA landmarks (form, search, footer) present; 10+ icon-only buttons lack aria-label; no skip link found.

4. **Copy consistency pass**: Standardize toolbar buttons to Indonesian-only (recommend: `Tambah`, `Unduh Template`, `Impor`, `Atur Ulang`, `Segarkan`). Expand jargon on first use: `RPE → Rincian Pekan Efektif`, `HEB → Hari Efektif Belajar`, `NIPD → Nomor Induk Pelajar Dalam`, `REAL → Kelas Riil`, `DAPO → Data Pokok Pendidikan`. Make error messages actionable (tell user what to do, not just what failed). Evidence: GuruPage.tsx toolbar has `Tambah Guru | Template | Import | Reset | Refresh` (ID/EN mixing); CalendarPage.tsx has unexplained `RPE`, `HEB`, `KBM`, `SAS/SAT` acronyms.

5. **Button variant consolidation**: Create a `<Button>` component with semantic variants: Primary (filled), Secondary (outline), Danger, Ghost, Accessibility (icon). Use config tokens (`primary-600`, `neutral-300`) consistently. Evidence: Current buttons mix `primary-600`, `blue-600`, `emerald-600` for "primary" actions across pages — 9 total variants with no systematic naming.

---

## Redesign Principles in Priority Order

1. **Aesthetic (#3)** — Establish a unified visual system where every color, border-radius, and shadow comes from the config. No raw Tailwind defaults on UI elements. This is the foundation for all other principles.

2. **As little design as possible (#10)** — Every repeated pattern (modal, toolbar, form, table, pagination, empty state) must be ONE component, not 3 separate implementations. Extract before building new features.

3. **Thorough (#8)** — Accessibility is not a feature, it's infrastructure. Skip link, form labels, aria labels, focus management, reduced-motion gating — these must be in every component from day one.

4. **Understandable (#4)** — Every acronym, every button label, every error message must be clear to a Indonesian school staff member with no technical background. No mixed languages in the same UI section.

5. **Environmentally friendly (#9)** — Every animation must have a `@media (prefers-reduced-motion)` alternative. No auto-playing motion. Motion conveys state only.

---

## Deliverables for the Plan

- **Design system component inventory** — list every shared component to build, with variants and states per component
- **Token audit checklist** — file-by-file scan of Tailwind token usage, with replacement mappings
- **Accessibility checklist** — per-component ARIA requirements (skip link, form labels, aria-label, focus-visible, reduced-motion)
- **Migration path** — how to refactor existing pages incrementally (don't rewrite everything at once)
- **Cutover criteria** — when is the old inline-Tailwind pattern retired? (e.g., all pages migrated or new pages must use components)
- **ESLint/design guard** — how to enforce token discipline going forward

---

## Anti-patterns to Guard Against

- **Porting old structure under new styling** — the goal is shared components, not a prettier version of the same 9 repeated patterns
- **Building ALL components before migrating any page** — this is a redesign with a live codebase; deliver incrementally
- **Adding new abstractions where a direct change suffices** — if only one page uses a pattern, inline is fine until a second page needs it
- **Designing components without states** — every interactive component must ship with: default, hover, focus, active, disabled, loading, error states
- **Ignoring performance** — user explicitly demanded no performance regression. Any component that adds bundle size must justify it with lazy loading
