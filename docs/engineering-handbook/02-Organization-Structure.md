# 02. Organization Structure

Struktur organisasi proyek SIKAD v4.0 dirancang untuk memastikan pembagian peran yang jelas, pemisahan tugas (*separation of duties*), dan jalur koordinasi yang efisien antara tim manajemen, produk, dan teknis.

## 1. Bagan Organisasi Teknis

```mermaid
graph TD
    HOP[Head of Project] --> PM[Project Manager]
    HOP --> PO[Product Owner]
    PM --> SA[Software Architect]
    PM --> DA[Database Architect]
    PO --> BA[Business Analyst]
    BA --> SysA[System Analyst]
    SA --> BL[Backend Lead]
    SA --> FL[Frontend Lead]
    SA --> UA[UI/UX Architect]
    SA --> SecA[Security Architect]
    SA --> PE[Performance Engineer]
    SA --> QA[QA Architect]
    SA --> AI[AI Solution Architect]
    DA --> BL
    BL --> DE[DevOps Engineer]
    BL --> TW[Technical Writer]
    PO --> CS[Customer Success & Implementation]
    DA --> DAn[BI / Data Analyst]
```

## 2. Hubungan Pelaporan & Jalur Koordinasi
- **Jalur Eskalasi Masalah Bisnis & Pelatihan:** CS -> BA -> PO -> HOP.
- **Jalur Eskalasi Masalah Teknis:** Developer -> Lead Engineer -> Software/Database Architect.
- **Jalur Rilis Produk:** DevOps -> QA -> PM -> PO -> HOP.

## 3. Panduan Penggabungan Peran (Role Consolidation Guidelines)
Untuk tim skala menengah/kecil yang mengalami keterbatasan sumber daya manusia (*role fatigue*), 16 peran spesifik dapat dirampingkan ke dalam 4 profil konsolidasi:

| Profil Konsolidasi | Peran yang Digabung | Deskripsi & Fokus Kerja |
|---|---|---|
| **Business & Product Profile** | PO + BA + SysA + CS | Mengelola hubungan dengan sekolah, menyusun backlog, melatih guru, dan merancang use case sistem. |
| **Core Architecture & Backend** | SwArch + DbArch + BE Lead + DevOps | Merancang database, menulis repositori/service backend, mengelola RLS, dan mengatur pipa CI/CD. |
| **Frontend & UI/UX Design** | FE Lead + UIUX Architect + Performance | Merancang mockups visual, membangun antarmuka web/Tauri, dan optimasi performa rendering/bundle. |
| **QA, Writer & Security** | QA Arch + Technical Writer + Security | Menulis pengujian otomatis, menyusun panduan buku manual, dan memverifikasi keamanan sistem dari kebocoran data. |
