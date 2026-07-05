# 02-scorecard.md — Sync Validation Modal Design Audit Scores

Based on evidence in `01-evidence.md`.

---

## 1. Good design is innovative — Score: 1/3

**Evidence:** The modal uses a standard confirmation dialog pattern (header → warning → content list → footer actions) that is ubiquitous across web applications. No novel interaction patterns are introduced.

**Justification:** The component replicates existing modal patterns without innovation. While it adds value by showing preview data, the interaction paradigm (expandable list, confirm/cancel) is boilerplate.

---

## 2. Good design makes a product useful — Score: 3/3

**Evidence:**
- Primary task (confirm sync/pull) completes in 2 steps: view preview → click confirm
- Empty state prevents accidental sync with no data (line 352)
- Disabled confirm button when nothing to sync (line 545: `totalCount === 0`)
- Clear warning banner about data overwrite (lines 312-333)

**Justification:** The modal directly supports the primary task of helping users understand what will be synced. Every element serves the confirmation workflow.

---

## 3. Good design is aesthetic — Score: 2/3

**Evidence:**
- Uses consistent spacing (py-4, px-6) across header, content, footer
- Color coding for operation types (green=INSERT, blue=UPDATE, red=DELETE) creates visual system
- Icon set from lucide-react is cohesive
- Minor contrast concern: text-neutral-500 on bg-neutral-100 at lines 395-397

**Justification:** The modal follows the existing design system (Tailwind + neutral tokens) consistently. One minor contrast issue prevents a perfect score.

---

## 4. Good design makes a product understandable — Score: 2/3

**Evidence:**
- Indonesian labels are mostly clear (e.g., "Konfirmasi Sinkronisasi", "Batal")
- Technical jargon present: "(incremental)" and "(full)" at line 425 — unclear to non-technical users
- Table names use technical Dexie names as secondary labels (e.g., "pembagianMengajars" at line 396)
- Operation types (INSERT/UPDATE/DELETE) use database terminology

**Justification:** Primary labels are understandable but secondary labels and operation badges use jargon that requires technical knowledge to interpret.

---

## 5. Good design is unobtrusive — Score: 2/3

**Evidence:**
- Modal backdrop (bg-black/50) dims but doesn't fully obscure context
- Icon-only close button (X) is subtle
- Chrome is present but doesn't dominate — content (table list) is the figure
- Empty/success states use green checkmark to indicate positive outcome

**Justification:** The modal chrome (header, warning, footer) is visible but recedes behind the actionable content. Some decoration (purple badge for delta sync) could be considered unnecessary.

---

## 6. Good design is honest — Score: 2/3

**Evidence:**
- Warning banner clearly states: "Tindakan ini akan mengubah data di server cloud" (line 324)
- Info box lists what happens: "Data cloud akan menimpa data lokal" (line 514)
- BUT: "(cloud wins)" framing is ambiguous — neutral/positive framing minimizes destructive nature of pull (line 514)
- Confirmation button dynamically shows count: "Ya, Sinkronkan 5 Data" (line 561)

**Justification:** Most claims are honest, but "cloud wins" framing downplays the destructive overwrite behavior. A user might not realize their local changes will be permanently replaced.

---

## 7. Good design is long-lasting — Score: 2/3

**Evidence:**
- Uses Tailwind utility classes (no trendy CSS features)
- Color tokens from neutral/primary/blue palette (not fad gradients or trendy colors)
- Standard modal layout hasn't changed in web conventions
- Font sizes use standard scale (text-xs, text-sm, text-lg)

**Justification:** The visual language has no obvious trend markers but also no distinctive character. Neutral/purposeful design ages well.

---

## 8. Good design is thorough down to the last detail — Score: 2/3

**Evidence:**
- States: empty ✅, loading ✅, error ✅, success ✅, disabled ✅
- States missing: **focus** — no explicit focus-visible or focus:ring styling
- No ARIA labels on icon-only buttons (close X button at line 302)
- No focus trap for modal accessibility
- Missing aria-live for dynamic loading states

**Justification:** All major states are handled but accessibility details (focus rings, ARIA) are incomplete. This is a common gap in production UIs.

---

## 9. Good design is environmentally friendly — Score: 1/3

**Evidence:**
- **17 Supabase count queries** triggered when opening modal in "tarik" mode (lines 171-205)
- Each query fetches record count from a different table
- No request deduplication or caching
- JS bundle impact: ~5-15KB for lucide icons

**Justification:** The tarik mode makes 17 network requests on modal open — this is a significant anti-pattern for offline-first apps. A single aggregated query or cached count would be more efficient.

---

## 10. Good design is as little design as possible — Score: 2/3

**Evidence:**
- 5 interactive elements total (close, expand toggle ×N, Batal, Confirm)
- Operation badges repeat in header and expanded details (lines 403-416, 449-457) — one could be removed
- Delta sync badge "(incremental)" / "(full)" appears per table — could be consolidated
- Backdrop blur is purely decorative

**Justification:** The component is mostly lean but has some redundancy (repeated badges) and decoration (backdrop blur) that don't serve the primary task.

---

## Total Score: 19/30

| # | Principle | Score |
|---|-----------|-------|
| 1 | Innovative | 1/3 |
| 2 | Useful | 3/3 |
| 3 | Aesthetic | 2/3 |
| 4 | Understandable | 2/3 |
| 5 | Unobtrusive | 2/3 |
| 6 | Honest | 2/3 |
| 7 | Long-lasting | 2/3 |
| 8 | Thorough | 2/3 |
| 9 | Eco-friendly | 1/3 |
| 10 | As little design as possible | 2/3 |
| | **TOTAL** | **19/30** |
