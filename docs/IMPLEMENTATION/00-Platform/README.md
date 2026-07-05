# 00-Platform — AI Engineering Workspace Platform (AETHER)

> **Document Version**: 1.1 | **Last Updated**: Juni 2026 | **Status**: ACTIVE

## Konteks Proyek Induk

Platform AETHER lahir dari kebutuhan nyata proyek **SIKAD v4.0** — sebuah sistem informasi kurikulum dan administrasi akademik berskala enterprise. Selama pengembangan SIKAD v4.0, ditemukan bahwa kolaborasi multi-agent AI (ChatGPT, Claude Code, Gemini CLI, Cursor, Windsurf) memerlukan **standar tata kelola workspace** agar agen dapat bekerja sesuai aturan tim engineering tanpa melanggar handbook, RACI matrix, atau Definition of Done.

Folder `docs/engineering-handbook/` di workspace ini merupakan **contoh implementasi pertama** (reference implementation) dari aturan tata kelola yang akan distandarisasi oleh AETHER.

## Urutan Baca Dokumen

Dokumen-dokumen berikut harus dibaca secara berurutan agar pemahaman terbangun secara progresif:

```text
┌─────────────────────────────────────────────────────────┐
│  URUTAN BACA FONDASI PLATFORM AETHER                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. 00.01-PLATFORM_PRD.md          ← APA yang dibangun │
│       ↓                                                 │
│  2. 00.02-PLATFORM_ARCHITECTURE.md ← BAGAIMANA bangunan│
│       ↓                                                 │
│  3. 00.03-PLATFORM_ROADMAP.md      ← KAPAN dibangun    │
│       ↓                                                 │
│  4. 00.04-MODULE_BREAKDOWN.md      ← SIAPA (modul)     │
│       ↓                                                 │
│  5. 00.05-DEVELOPMENT_PLAN.md      ← BERAPA usahanya   │
│       ↓                                                 │
│  6. 00.06-MVP_SCOPE.md             ← SEBERAPA besar    │
│       ↓                                                 │
│  7. 00.07-RELEASE_PLAN.md          ← BAGAIMANA rilis    │
│       ↓                                                 │
│  8. 00.08-RISK_REGISTER.md         ← APA risikonya     │
│       ↓                                                 │
│  9. 00.09-DEPENDENCY_MAP.md        ← SIAPA butuh SIAPA │
│       ↓                                                 │
│ 10. 00.10-IMPLEMENTATION_SEQUENCE  ← URUTAN optimal     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Peta Hubungan Antar Dokumen (Document Dependency Graph)

```text
00.01 PRD ──────────────────> 00.02 Architecture ──────> 00.03 Roadmap
  │                               │        │                   │
  │ Goals, Persona                │        │ Layers            │ Phases
  │                               │        │                   │
  v                               v        v                   v
00.06 MVP Scope              00.04 Module Breakdown       00.05 Dev Plan
  │                               │                           │
  │ Release Boundaries            │ 16 Modules + API          │ Epic/Story/SP
  │                               │                           │
  v                               v                           v
00.07 Release Plan           00.09 Dependency Map        00.10 Impl Sequence
                                  │                           │
                                  └─────────┬─────────────────┘
                                            v
                                  00.08 Risk Register
```

## Referensi Proyek Terkait

| Referensi | Lokasi |
|-----------|--------|
| PRD SIKAD v4.0 | `docs/00 PRD REVISION LOG.md` |
| Engineering Handbook | `docs/engineering-handbook/` |
| AI Agent Rules | `.agents/AGENTS.md` |
| Integration Blueprint | `docs/engineering-handbook/40-Assessment-Integration-Blueprint.md` |
