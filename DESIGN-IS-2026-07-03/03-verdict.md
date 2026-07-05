# 03-verdict.md — AETHER Monitoring Dashboard Design Audit

## Verdict: REFINE

**The AETHER Monitoring Dashboard's bones are solid. At 22/30 with no load-bearing principle at 0, the design should be refined rather than rebuilt. The primary task is clear, labels are honest, and the aesthetic foundation is coherent. What remains are targeted gaps in accessibility, state coverage, dead-code hygiene, and color system consistency — all fixable without redesigning structure.**

---

## Why Not REDESIGN

Total score is 22/30 — well above the 20/30 threshold. No principle scored 0. The three lowest-scoring principles (#1 innovative at 1, and #3 aesthetic / #8 thorough / #9 environmentally friendly / #10 as little design at 2) are all incremental gaps, not structural failures. No load-bearing dimension — #2 useful (3/3), #4 understandable (3/3), #6 honest (3/3) — is broken.

## Why Not NEW

The design exists, ships, and functions. It is not a stub or wireframe.

---

## Top 3–5 Highest-Leverage Fixes

### 1. #9 Environmentally Friendly (Score: 2/3) — Fix prefers-reduced-motion gap

**Evidence:** `index.css` has zero `@media (prefers-reduced-motion: reduce)` queries. The `@keyframes pulse` animation at `index.css:88` runs unconditionally on `.pulse-indicator.active`, regardless of OS-level motion preferences.

**Move:** Add one `@media (prefers-reduced-motion: reduce)` rule in `index.css` that sets `animation: none` on `.pulse-indicator.active`, preventing motion for users who have requested it at the OS level.

**Why priority 1:** This is the only confirmed accessibility compliance gap. It affects users with vestibular disorders. A one-line fix closes the gap entirely.

---

### 2. #8 Thorough (Score: 2/3) — Add loading state

**Evidence:** No skeleton loader, spinner, or loading indicator exists anywhere. `index.js:19–38` — `initDashboard()` silently fetches `/api/stats` and `/api/logs` with no loading UI while the requests are in flight. `index.js:251` defines `fetchStats()` as a standalone function but it is never called.

**Move:** Add a CSS class for a loading skeleton or a minimal spinner, and render it in the initial HTML while data is being fetched. Alternatively, render the empty-state with a "Loading…" label instead of a static "No execution logs available." message.

**Why priority 2:** Users currently see a blank or static empty-state during the initial data fetch. A loading indicator communicates "data is on its way" rather than "there is no data."

---

### 3. #10 As little design as possible (Score: 2/3) — Remove dead code

**Evidence:**
- `index.js:251` — `fetchStats()` function defined but **never called anywhere in the file**
- `index.css:114` — `.status-dot.red` class defined but never applied to any static HTML element
- `index.css:119` — `.status-badge.disconnected` defined but applied only via JS `innerHTML` at `index.js:223` — the class name is set dynamically, but the CSS rule is orphaned since the HTML already exists in the DOM; the class gets swapped in at runtime rather than being a pre-existing HTML attribute, so the CSS definition doesn't serve its intended purpose
- `index.css:363` — `.details-tooltip` defined but never applied to any element

**Move:** Remove the unused `fetchStats()` function. Audit whether `.status-dot.red` and `.status-badge.disconnected` are intentionally present as runtime-swapped classes or genuinely dead, then remove if confirmed unused. Remove `.details-tooltip` if not applied by `index.js` at runtime.

**Why priority 3:** Dead code is a maintenance liability. Removing it reduces the surface area for future confusion and makes the codebase honest about what it actually renders.

---

### 4. #3 Aesthetic (Score: 2/3) — Consolidate hardcoded chart colors into CSS variables

**Evidence:** The donut chart palette at `index.js:103` is hardcoded as `['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899']`. Three of these colors (`#3b82f6`, `#10b981`, `#f59e0b`, `#ef4444`) already exist as CSS variables (`--accent-color`, `--success`, `--warning`, `--danger`), but the JS palette duplicates them with inline hex values. Additional colors outside the token system: `#8b5cf6`, `#ec4899`, `#1f2937` (hardcoded inline in SVG creation at `index.js:86, 94, 147`).

**Move:** Define all chart colors as CSS variables in `:root`, then reference `getComputedStyle(document.documentElement).getPropertyValue('--accent-color')` in JS or pass them as data attributes. This ensures one source of truth.

**Why priority 4:** Duplicated color values drift out of sync when a brand color changes. For a monitoring dashboard tracking multiple models, having a dedicated model-color palette token set in CSS is more maintainable.

---

### 5. #1 Innovative (Score: 1/3) — No action required (lowest leverage)

The dashboard imitates established DevOps monitoring patterns. This is not a functional problem. Structural novelty is not a prerequisite for a good monitoring tool. Skipping this as a design fix — it would require a full creative redesign with no guarantee of improvement to the primary task.

---

## Regression Checklist (Items to Confirm Still Score 3 After Refine)

- **#2 Useful (3/3):** After any structural changes, verify the primary task loop (land → read health → drill into logs) still completes in ≤3 steps. Grep for any new navigation or modal added during the refine pass.
- **#4 Understandable (3/3):** All new labels added must pass the "first-time user names this correctly" test. Any new jargon introduced must be accompanied by a plain alternative or tooltip.
- **#6 Honest (3/3):** No new claims, badges, or labels added during the refine pass may overstate what the system actually does. Verify all SSE state labels still match actual `onopen`/`onerror` behavior.
