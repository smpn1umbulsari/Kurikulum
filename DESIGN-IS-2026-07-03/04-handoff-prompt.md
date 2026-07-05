# 04-handoff-prompt.md — AETHER Monitoring Dashboard Design Audit

/make-plan Refine AETHER Monitoring Dashboard based on a Dieter Rams audit (total 22/30).

## Verdict paragraph (quoted from 03-verdict.md)

> The AETHER Monitoring Dashboard's bones are solid. At 22/30 with no load-bearing principle at 0, the design should be refined rather than rebuilt. The primary task is clear, labels are honest, and the aesthetic foundation is coherent. What remains are targeted gaps in accessibility, state coverage, dead-code hygiene, and color system consistency — all fixable without redesigning structure.

---

## Keep (already strong, do NOT touch in this pass)

- **Principle #2 — Useful scored 3/3.** Evidence: `src/core/dashboard/public/index.html:70,73` (two filter selects narrow log output), `src/core/dashboard/public/index.js:214` (SSE live updates), `src/core/dashboard/public/index.html:55–63` (donut chart answers spend question at a glance). Regression check: grep for any new `<nav>`, `<a>`, or modal added during refine — the primary task loop must stay ≤3 steps.
- **Principle #4 — Understandable scored 3/3.** Evidence: `src/core/dashboard/public/index.html:85–89` (table headers Time, Agent, Role, Action, Status — self-explanatory), "Connected (Live)" at `index.js:217` accurately reflects SSE `onopen` state. Regression check: any new label added must be tested by a first-time user mentally naming the control.
- **Principle #6 — Honest scored 3/3.** Evidence: zero marketing superlatives, zero dark patterns, no label→behavior mismatches across all four audited files (`index.html`, `index.css`, `index.js`, `tui.js`). Regression check: grep for any new badge or status label added — verify it maps 1:1 to actual data.

---

## Fix in priority order (top 3–5 moves from the audit, verbatim)

1. **Principle #9 — Environmentally Friendly:** Add `@media (prefers-reduced-motion: reduce)` to `src/core/dashboard/public/index.css` that sets `animation: none` on `.pulse-indicator.active`. The `@keyframes pulse` at `index.css:88` currently runs unconditionally regardless of OS-level motion preferences. Evidence: `index.css:85,88`.
2. **Principle #8 — Thorough:** Add a loading state to `src/core/dashboard/public/index.js` — render "Loading…" or a skeleton before `initDashboard()` resolves its `fetch` calls at lines 19–38. Currently there is no loading indicator; the empty-state text shows during data fetch with no indication that data is incoming. Evidence: `index.js:19–38`.
3. **Principle #10 — As little design as possible:** Remove four dead items: (a) `fetchStats()` function at `src/core/dashboard/public/index.js:251` — defined but never called; (b) `.status-dot.red` CSS class at `index.css:114` — defined but never applied; (c) `.details-tooltip` CSS class at `index.css:363` — defined but never applied; (d) audit `.status-badge.disconnected` at `index.css:119` — applied dynamically via `innerHTML` at `index.js:223` but the CSS rule may be redundant if the class swap is not working as intended. Evidence: `index.js:251`, `index.css:114,119,363`.
4. **Principle #3 — Aesthetic:** Consolidate the hardcoded JS chart palette at `src/core/dashboard/public/index.js:103` (`['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899']`) into CSS custom properties in `:root`. The three inline hardcoded colors `#8b5cf6`, `#ec4899`, `#1f2937` (`index.js:86,94,147`) should also move to CSS variables. Evidence: `index.js:86,94,103,147`.

---

## Out of scope for this refine pass

- Do NOT add new pages, routes, or navigation
- Do NOT redesign the glassmorphism aesthetic or color palette
- Do NOT change the SSE live-update architecture
- Do NOT modify the TUI (`src/core/dashboard/tui.js`) — it is a separate surface
- Do NOT add new chart types or rearrange the grid layout
- Do NOT touch the SIKAD v4.0 React frontend pages

---

## Deliverables for the plan

- **Fix 1 (prefers-reduced-motion):** Exact CSS rule to add to `index.css`, with `:root` or targeted selector, and which existing animation property it overrides.
- **Fix 2 (loading state):** Where in `index.js` to insert the loading indicator (before `initDashboard` calls, or conditional on `isLoading` state). Specify whether to use a text label or CSS-only spinner.
- **Fix 3 (dead code):** Exact lines to delete from `index.js` and `index.css`. Confirm whether `.status-badge.disconnected` at `index.css:119` should be kept or removed.
- **Fix 4 (color consolidation):** Proposed CSS variable names for the extended model-color palette (e.g., `--model-1`, `--model-2`, etc.), which JS lines to change, and how the `renderDonutChart()` function should read them.
- **Regression checklist:** Confirmation that the three "Keep" items (Useful 3/3, Understandable 3/3, Honest 3/3) are verified after the refine.

---

## Anti-patterns to guard against (specific to REFINE)

- **Do not add new abstractions** where a direct change suffices — Fix 1 is one CSS rule, Fix 3 is line deletion. No new utility functions or wrapper components.
- **Do not restyle areas that already scored 3** — the metric cards, table headers, and SSE status badge are strong. Changing their visual treatment risks regressing Useful, Understandable, or Honest scores.
- **Do not scope creep into structural redesign** — the web dashboard's layout (header + 4 metric cards + main grid with chart + logs) is not being changed. Only the gaps above are being closed.
- **Do not let fixes mutate principles outside the priority list** — any new element added during this refine must be evaluated against the 10 principles before merging. If a new element would violate #5 (unobtrusive) or #10 (as little design as possible), it must be reconsidered.
- **Fix 3 (dead code) is not optional** — `fetchStats()` at `index.js:251` is a maintenance hazard. If the intention was to call it after SSE action events (comment at `index.js:241` says "Trigger a fresh stats fetch to sync state" above a `fetchStats()` call that doesn't exist), that call should either be restored or the function should be deleted. Do not leave dead functions in the codebase.
