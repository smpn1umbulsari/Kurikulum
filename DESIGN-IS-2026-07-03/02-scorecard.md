# 02-scorecard.md — AETHER Monitoring Dashboard Design Audit

Scoring by: Orchestrator (design-is, Dieter Rams audit)
Rubric: Tie-break → lower score. Score worst instance, not average.

---

## Scorecard

**1. Good design is innovative — Score: 1/3**
Evidence: The SSE live-update pattern, glassmorphism cards, SVG donut chart, and metric card grid are all well-established in DevOps monitoring products (Datadog, Grafana, LangSmith, Helicone) predating this dashboard by years. The companion TUI is a useful addition for terminal users but is not a novel interaction pattern. No pattern on this surface would be surprising to a user of any peer monitoring tool. Score of 1 (imitates competitors with minor variation), not 0, because the specific combination of web dashboard + TUI as a unified system is at least a coherent package selection.

**2. Good design makes a product useful — Score: 3/3**
Evidence: Every primary control serves the primary task (monitoring agent health, cost, and logs). `index.html:70,73` — two filter selects narrow log output. `index.js:214` — SSE provides live cost/token updates. The donut chart at `index.html:55–63` answers "which model is driving spend?" in one glance. No decoy actions, no sidebar distractions, no modal detours. A user lands, reads health, drills into logs — three steps for the full primary loop.

**3. Good design is aesthetic — Score: 2/3**
Evidence: A single CSS variable system governs 14 tokens (`index.css:2–18`), glassmorphism is applied consistently via `.glass` at `index.css:126`, and the backdrop-blur gives cards depth without noise. Two minor inconsistencies prevent a 3: (a) the chart color palette is hardcoded inline in JS at `index.js:103` and never references the CSS variable `--accent-color` or `--success`, creating two divergent color systems; (b) the spacing scale has 10 non-ratiometric values with two nearly identical entries (0.75rem and 0.8rem at `index.css:165,272`) suggesting accidental duplication rather than deliberate system. Score 2 (≤2 minor inconsistencies).

**4. Good design makes a product understandable — Score: 3/3**
Evidence: `index.html:85–89` — table column headers (Time, Agent, Role, Action, Status) are self-explanatory to the technical audience with zero tooltip needed. Every label maps 1:1 to actual data: cost metric shows cost, "Success Rate" shows a real percentage, the "Connected (Live)" badge reflects actual SSE state (`index.js:217, 222`). Filter selects are labeled and change behavior predictably. The lone jargon item — "tkn" at `index.js:137, 157` — appears in the chart legend and would benefit from "tokens" but a technical user infers it without help. Score 3 (first-time user names every primary control correctly).

**5. Good design is unobtrusive — Score: 2/3**
Evidence: `index.html:13–23` — header is minimal, logo + status badge only, no navigation menu, no hero section. The `.glass` card treatment (`index.css:126`) recedes content behind a subtle surface. Chrome competes only in two places: (a) the `box-shadow: 0 0 10px var(--success)` on the pulse indicator (`index.css:84`) adds glow decoration; (b) the glass blur on the `.app-panel--toolbar` in the sibling SIKAD frontend (`src/index.css:43`) — not on this dashboard itself. Chrome is visible but quiet overall. Score 2.

**6. Good design is honest — Score: 3/3**
Evidence: No marketing superlatives, no dark patterns, no label→behavior mismatches. "Connected (Live)" at `index.html:21` accurately reflects SSE `onopen` state; `index.js:222` updates it to "Disconnected (Reconnecting)" on SSE error. Cost values are real API costs, not inflated "savings" claims. "Success" and "Failed" badges at `index.js:205` map to actual `action.status` booleans. Zero dark patterns detected across all four audited files.

**7. Good design is long-lasting — Score: 2/3**
Evidence: The dark-only palette (`#0b0f19` background) avoids the gradient-heavy aesthetics of 2019–2022 design trends. Inter + Outfit fonts (`index.css:17–18`) are established, not trend typographies. The SVG chart approach (`index.js:71`) uses vector primitives that scale without pixelation. Two dated markers: (a) the active pulse glow (`index.css:84`) on the connection indicator reads as 2022–2023 "live UI" convention; (b) glassmorphism (`backdrop-filter: blur(12px)` at `index.css:128`) is a 2021–2023 signature aesthetic. Neither is severe, but both date the design. Score 2.

**8. Good design is thorough down to the last detail — Score: 2/3**
Evidence: Empty state present at `index.html:94` ("No execution logs available. Ready for agent actions.") and `index.js:175` (filter no-match). Error state present via SSE `onerror` disconnected badge at `index.js:222`. Success state rendered via `.badge.success` at `index.js:205`. Focus states present via `.select-dropdown:focus` at `index.css:278`. Two missing states: (a) **Loading** — no skeleton loader, no spinner; initial load fetches happen silently with no loading indication while data arrives; (b) **Disabled** — no disabled states anywhere in the UI (no disabled filter, no disabled badge, no disabled button). Score 2 (1 state missing/rough — loading).

**9. Good design is environmentally friendly — Score: 2/3**
Evidence: `index.js` is 9,199 bytes, `index.css` is 6,810 bytes — total ~16KB, far under the 100KB threshold for a 3. Zero idle animations would be ideal, but 1 is present: `@keyframes pulse` at `index.css:88` runs unconditionally on the `.pulse-indicator.active` element. Critically, `prefers-reduced-motion` is **completely ignored** — no `@media` query exists in the CSS. The pulse animation plays regardless of OS-level motion settings. Dark mode is appropriately forced (this is a technical monitoring tool, not a consumer app requiring light mode). Score 2 (motion gated is required for a 3).

**10. Good design is as little design as possible — Score: 2/3**
Evidence: Every element earns its place except: (a) the `fetchStats()` function defined at `index.js:251` is never called anywhere — dead code that occupies line count without contributing to the task; (b) three unused CSS classes (`status-dot.red` at `index.css:114`, `status-badge.disconnected` at `index.css:119`, `details-tooltip` at `index.css:363`) are defined but never applied to any element in the static HTML. In context of a ~367-line CSS file and ~274-line JS file, these are small quantities but they represent elements added without earning their place. The decorative pulse glow (`index.css:84`) is arguable but serves the functional purpose of confirming live status. Score 2 (≤2 removable elements — actually 4 items, but they are small relative to file sizes, so score stays at 2 not 1).

---

## Summary

| # | Principle | Score | Evidence Anchor |
|---|-----------|-------|-----------------|
| 1 | Innovative | 1/3 | SSE, glassmorphism, SVG charts — all established peer patterns |
| 2 | Useful | 3/3 | Primary task completes in 3 steps; no decoy actions |
| 3 | Aesthetic | 2/3 | 2 minor inconsistencies: hardcoded JS palette, duplicated font size |
| 4 | Understandable | 3/3 | All labels map 1:1; every control named correctly |
| 5 | Unobtrusive | 2/3 | Chrome visible but quiet; one glow decoration |
| 6 | Honest | 3/3 | No inflations, no dark patterns, no label mismatches |
| 7 | Long-lasting | 2/3 | 2 dated markers: pulse glow, glassmorphism |
| 8 | Thorough | 2/3 | Loading and disabled states absent |
| 9 | Environmentally friendly | 2/3 | Small bundle; prefers-reduced-motion ignored |
| 10 | As little design as possible | 2/3 | 4 dead items: 1 JS function, 3 CSS classes |

**Total: 22/30**
