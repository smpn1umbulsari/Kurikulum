# 27. Branching Strategy

Manajemen cabang (branching) SIKAD v4.0 memisahkan lingkungan kerja pengembangan, pengujian, dan produksi.

## 1. Peta Lingkungan Cabang (Branch-to-Environment Map)

```mermaid
gitgraph
    commit id: "Initial Release" tag: "v4.0.1"
    branch develop
    checkout develop
    commit id: "Add Core Sync"
    branch feature/assessment
    checkout feature/assessment
    commit id: "Draft grading form"
    commit id: "Complete form tests"
    checkout develop
    merge feature/assessment
    branch staging
    checkout staging
    merge develop id: "Deploy to UAT" tag: "v4.0.0-rc1"
    checkout develop
    commit id: "Fix UAT feedback"
    checkout staging
    merge develop id: "Approve for Prod"
    checkout main
    merge staging id: "Deploy to Prod" tag: "v4.0.0"
```

## 2. Penamaan Branch
- **Feature Branch:** `feature/<modul-nama>` (contoh: `feature/graduation-engine`).
- **Bugfix Branch:** `bugfix/<issue-id>` (contoh: `bugfix/fix-sync-delay`).
- **Hotfix Branch:** `hotfix/<tag-versi>` (contoh: `hotfix/patch-rls-bypass`).
