# 01-evidence.md — AETHER Monitoring Dashboard Design Audit

Evidence gathered by four parallel subagents. Orchestrator consolidation follows.

---

## Structural Evidence

**Source:** Structural subagent (Agent ID: acd64a80903a0392e)

### Interactive Element Count: 9

| Element | Location | Type |
|---------|----------|------|
| `#filter-agent` `<select>` | `index.html:70` | filter dropdown |
| `#filter-status` `<select>` | `index.html:73` | filter dropdown |
| `EventSource('/api/events')` | `index.js:214` | SSE connection |
| `source.onopen` | `index.js:216` | SSE event handler |
| `source.onerror` | `index.js:221` | SSE error handler |
| `source.onmessage` | `index.js:226` | SSE message handler |
| SIGINT handler | `tui.js:49` | keyboard signal |
| exit handler | `tui.js:50` | process signal |
| Ctrl+C (implicit SIGINT) | `tui.js:49` | keyboard shortcut |

### Max Nesting Depth: 6

- **HTML:** `html > body > div.app-container > section.metrics-grid > div.metric-card > p.metric-value` (6 levels)
- **JS (renderDonutChart):** `renderDonutChart() > if models.length === 0 > ...svg.appendChild()` (6 levels)
- **JS (onmessage):** `source.onmessage = (event) > try > if data.type === 'report' > ... > fetchStats()` (6 levels)

### Repeated Patterns: 5

1. `metric-card glass` repeated **4×** — `index.html:27, 32, 37, 42`. All identical structure (h3 label, p metric-value, span metric-sub, plus optional progress-bar-bg).
2. `select-dropdown` class repeated **2×** — `index.html:70, 73`.
3. `progress-bar-bg/progress-bar-fill` in metric-card #4 only — not present in cards 1–3 (asymmetric).
4. `status-dot` with red variant — `index.css:114` defines `.status-dot.red`, used dynamically in `index.js:221`.
5. Table header columns repeated in logs table and TUI action table — 5 columns each.

### Dead Props / Unused Imports: 4

| Item | File | Line | Status |
|------|------|------|--------|
| `status-dot.red` CSS class | `index.css` | 114 | Defined but not applied to any static HTML element |
| `status-badge.disconnected` CSS class | `index.css` | 119 | Applied dynamically via JS innerHTML at `index.js:223` — not a dead prop per se, but the class exists only in CSS |
| `details-tooltip` CSS class | `index.css` | 363 | Defined but never applied to any HTML element |
| `fetchStats()` function | `index.js` | 251 | Defined but **never called** anywhere in the file |

---

## Visual Evidence

**Source:** Visual subagent (Agent ID: ab756974192d4e6c5)

### Spacing Scale

Values (rem): `0.15, 0.4, 0.5, 0.75, 0.8, 1, 1.25, 1.5, 2, 3`
No consistent mathematical scale (e.g., 4px base × 1.5 ratio). Values appear organic.

### Type Scale

Values (rem): `0.75, 0.8, 0.85, 1.15, 1.75, 2.25`
No consistent ratio. Two values are very close (0.75 and 0.8) suggesting accidental duplication.

### Distinct Color Count: 21

CSS variable colors: `--bg-primary #0b0f19`, `--bg-card rgba(17,24,39,0.55)`, `--border-color rgba(255,255,255,0.07)`, `--text-primary #f3f4f6`, `--text-secondary #9ca3af`, `--accent-color #3b82f6`, `--accent-glow rgba(59,130,246,0.3)`, `--success #10b981`, `--success-glow rgba(16,185,129,0.2)`, `--warning #f59e0b`, `--warning-glow rgba(245,158,11,0.2)`, `--danger #ef4444`, `--danger-glow rgba(239,68,68,0.2)`

Hardcoded JS colors (outside CSS token system): `#8b5cf6`, `#ec4899`, `#1f2937`

### Lowest Contrast Ratio: 17.6:1 (INFERRED)

- Background: `#0b0f19` → L = 0.00457
- Text: `#f3f4f6` → L = 0.91200
- Ratio: (0.91200 + 0.05) / (0.00457 + 0.05) = **17.63:1**
- WCAG AAA pass (≥7:1). Excellent.

### States Checklist

| State | Present? | Evidence |
|-------|----------|----------|
| Empty | ✅ Present | `index.html:94` — "No execution logs available. Ready for agent actions." |
| Loading | ❌ Missing | No loading spinner or skeleton UI; SSE status badge only |
| Error | ✅ Present | `index.js:221` — disconnected status badge; `index.js:175` — filter no-match message |
| Success | ✅ Present | Success badges rendered via `index.js:205` with `.badge.success` class |
| Focus | ✅ Present | `.select-dropdown:focus { border-color: var(--accent-color) }` at `index.css:278` |
| Disabled | ❌ Missing | No disabled states found in HTML, CSS, or JS |

### Idle Animations: 1

- `@keyframes pulse` at `index.css:88` — runs on `.pulse-indicator.active` unconditionally, no user interaction required.
- The `.progress-bar-fill` transition (`width: 0.4s ease` at `index.css:182`) is data-driven, not a decorative idle animation.

### Hardcoded Colors Outside CSS Token System

- `index.js:103`: `['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899']` — chart palette hardcoded in JS
- `index.js:86`: `'#1f2937'` — empty state SVG stroke
- `index.js:94`: `'#9ca3af'` — empty state text color
- `index.js:147`: `'#f3f4f6'` — donut center text

### Known Gaps (Visual)

- No live rendering — all facts inferred from static source
- No `@media (prefers-reduced-motion)` query in CSS
- No `@media (prefers-color-scheme: light)` — dark mode is forced

---

## Copy & Honesty Evidence

**Source:** Copy & Honesty subagent (Agent ID: a59bdf04e0b044599)

### Flagged Jargon: 1

| String | File | Line | Plain Alternative |
|--------|------|------|-------------------|
| `tkn` | `index.js` | 137, 157 | `tokens` |

"tkn" appears twice in the donut chart legend and center label (`src/core/dashboard/public/index.js:137, 157`). Non-native speakers and non-technical stakeholders may not immediately decode this abbreviation.

### Flagged Inflations: 0

No marketing superlatives ("powerful", "advanced", "seamless", "intelligent") found. No claims without backing.

### Flagged Dark Patterns: 0

No forced continuity, hidden costs, fake scarcity, or confirmshaming detected. The dashboard makes no commercial claims.

### Label → Behavior Mismatches: 0

- "Connected (Live)" (`index.html:21`, `index.js:217`) correctly updates to "Disconnected (Reconnecting)" (`index.js:222`) when SSE errors — accurate reflection of actual state.
- TUI has no disconnect handler rendering — not a mismatch but an absence.

### Known Gaps (Copy)

- Could not inspect `/api/stats`, `/api/logs`, `/api/events` response payloads for additional user-facing error strings
- Could not verify TUI chalk color reflects connection state — no SSE equivalent in TUI

---

## Weight & Friction Evidence

**Source:** Weight & Friction subagent (Agent ID: a610a3bd74b54e4ff)

### Bundle Sizes

| File | Bytes | Notes |
|------|-------|-------|
| `index.js` | 9,199 | Vanilla JS, no framework |
| `index.css` | 6,810 | Vanilla CSS, no preprocessor |
| **Total** | **~16 KB** | Small (<50KB threshold) |

### External Resources: 3 + (variable)

| Resource | Type |
|----------|------|
| `https://fonts.googleapis.com` | preconnect (header tag) |
| `https://fonts.gstatic.com` | preconnect with crossorigin |
| `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Outfit:wght@400;500;600;700&display=swap` | stylesheet link |

Font files (woff2) served from `fonts.gstatic.com` are additional variable-size requests (~15–30KB across weights).

### Network Requests on Primary View: 3

1. `EventSource('/api/events')` — persistent SSE connection
2. `fetch('/api/stats')` — initial stats fetch
3. `fetch('/api/logs')` — initial logs fetch

### Idle Animations: 1

- `@keyframes pulse` at `index.css:88` — runs on `.pulse-indicator.active` unconditionally.

### prefers-reduced-motion: **Ignored**

No `@media (prefers-reduced-motion: reduce)` query exists anywhere in the CSS. The pulse animation runs regardless of OS-level motion preferences.

### Dark Mode: **Forced**

All colors are dark-mode-only. No `@media (prefers-color-scheme: light)` or alternate variable set exists.

### Bundle Size Category: **Small** (<50KB)

JS (9.2KB) + CSS (6.8KB) + minimal external fonts = well under 50KB threshold. Excellent by this dimension.

### TUI Chalk Dependency

`tui.js:9` imports chalk as a runtime dependency. `package.json:23` confirms `"chalk": "^5.3.0"`. Loaded at Node.js startup before first render.

### Known Gaps (Weight)

- Google Fonts payload size not measured (depends on network delivery)
- No live server to measure actual `/api/*` request timing
- chalk module size in TUI not measured

---

## Cross-Subagent Observations (Orchestrator Notes)

1. **4 dead CSS classes** in a ~367-line CSS file is a 1.1% dead-code rate — low but nonzero.
2. **`fetchStats()` is defined but never called** (`index.js:251`) — the function exists to refresh stats after SSE action events, but the call was commented out or removed without removing the function definition. This is a maintenance risk.
3. **Chart palette is duplicated** — hardcoded inline in JS (`index.js:103`) and not shared with CSS variables. If a new model color is needed, both places must be updated.
4. **Two near-identical font sizes** (0.75rem and 0.8rem) suggest an accidental split rather than intentional design.
5. **TUI has no disconnect state** — unlike the web dashboard's SSE `onerror` handler that updates "Disconnected (Reconnecting)", the TUI has no analogous terminal render state for broken connections.
6. **`prefers-reduced-motion` gap** — the only accessibility gap affecting all users with motion sensitivity.
