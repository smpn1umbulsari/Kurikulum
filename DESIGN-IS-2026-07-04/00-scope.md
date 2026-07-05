# 00-scope.md — Sync Validation Modal Audit

## What is being audited

**Component:** Sync Validation Modal (`SyncValidationModal.tsx`)
- A confirmation popup that appears before users execute "Sinkron" (push) or "Tarik Data" (pull)
- Shows preview of data to be synchronized: table names, operation types, record counts
- Warns users about cloud/local data overwrite consequences

**Files audited:**
| File | Role |
|------|------|
| `src/components/sync/SyncValidationModal.tsx` | Main modal component |
| `src/components/sync/SyncToolbar.tsx` | Toolbar buttons that trigger the modal |
| `src/modules/settings/pages/MonitoringCenterPage.tsx` | "Force Sync" button also uses this modal |

**Context:** Part of SIKAD v4.0 offline-first sync system. Supabase-backed school management app.

## Primary user & task

- **User:** Admin sekolah atau Guru
- **Task:** Memahami preview data yang akan di-sinkron/ditarik, lalu mengkonfirmasi atau membatalkan
- **Goal:** Mencegah sinkronisasi yang tidak sengaja yang bisa menimpa data

## Constraints

- Must use existing design system (Tailwind CSS + neutral color tokens from CLAUDE.md)
- Must integrate with existing `useSync` hook and `syncEngine`
- Must work with Dexie IndexedDB schema
- No external UI libraries beyond lucide-react icons

## Non-goals for this audit

- Backend sync logic (SyncEngine.ts)
- Other sync UI surfaces (MonitoringCenterPage conflict resolution)
- Overall app navigation/layout

## References

- Existing design tokens in `src/index.css` and tailwind config
- Related components: `SyncToolbar`, `Toast`
- Sync engine: `src/services/sync/SyncEngine.ts`
