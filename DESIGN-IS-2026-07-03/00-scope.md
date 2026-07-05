# 00-scope.md — AETHER Monitoring Dashboard Design Audit

**Audit Date:** 2026-07-03
**Auditor:** design-is (Dieter Rams audit)

---

## What is Being Audited

**Surface:** AETHER Monitoring Dashboard — a real-time web dashboard for AI agent orchestration, plus its companion Terminal UI (TUI).

| Asset | Path |
|-------|------|
| Web Dashboard (HTML) | `src/core/dashboard/public/index.html` |
| Web Dashboard CSS | `src/core/dashboard/public/index.css` |
| Web Dashboard JS | `src/core/dashboard/public/index.js` |
| TUI (Node.js terminal) | `src/core/dashboard/tui.js` |

**Running context:** No live server required; all evidence is drawn from static source files.

---

## Who is the Primary User

**Primary user:** AI agents and developers running the AETHER orchestration platform. They are technical, context-switching between terminal, editor, and dashboard. They need rapid readability under cognitive load.

**Secondary user:** Human operators (developers, team leads) who glance at the dashboard to verify agent health, token spend, and action logs.

---

## What is the Primary Task

**Primary task:** Monitor live agent execution — cost, token usage, success rate, action logs — at a glance, and drill into per-agent activity.

Supporting tasks:
- Filter logs by agent and status
- Observe real-time SSE updates
- Export data as JSON/CSV (TUI)
- Understand which LLM model is driving spend

---

## Constraints

- **Stack:** Vanilla HTML/CSS/JS (no framework) for web dashboard; Node.js + chalk + readline for TUI
- **Theme:** Dark-mode-first glassmorphism dashboard (`#0b0f19` background, `rgba(17,24,39,0.55)` glass cards, accent blue `#3b82f6`)
- **Fonts:** Inter (sans) + Outfit (display) from Google Fonts
- **Real-time:** Server-Sent Events (SSE) for live updates
- **No build step:** Static files served directly

---

## Reference Designs / Competitors

Not formally scoped. Implicit references are typical DevOps/agent monitoring dashboards: Grafana, Datadog, LangSmith, Helicone. The AETHER dashboard competes on the same dimensions: at-a-glance metrics, log depth, live updates.

---

## Scope Boundaries (IN)

- Dashboard header (logo, connection status)
- 4 metric cards (Cost, Tokens, Actions, Success Rate)
- LLM Model Breakdown donut chart (SVG)
- Agent Execution Logs table with filters
- Empty state / no-data states
- TUI header, metrics grid, model breakdown bar, recent actions table, footer controls
- CSS token system (CSS variables, glassmorphism, animations)
- JS state management, XSS sanitization, SSE handling

## Scope Boundaries (OUT)

- Any SIKAD v4.0 React frontend pages (separate product)
- AETHER CLI backend code (`src/core/*.js` orchestration logic)
- Mobile viewport layouts (no responsive breakpoints audited beyond 900px media query)
- The `bin/aether.js` CLI entry point
- PRD compliance or platform documentation
