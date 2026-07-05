# SIKAD v4.0

<div align="center">

![SIKAD Logo](https://img.shields.io/badge/SIKAD-v4.0-6366F1?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Tauri](https://img.shields.io/badge/Tauri-2-FFC131?style=flat-square&logo=tauri)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**Sistem Informasi Kurikulum & Administrasi Akademik**

*Sistem administrasi akademik enterprise berbasis Offline-First untuk sekolah SMP di Indonesia*

</div>

---

## 🎯 About

SIKAD v4.0 adalah sistem informasi akademik enterprise yang dibangun dengan arsitektur **Offline-First**.

### Visi
Menjadi standar baru sistem administrasi akademik yang handal dan transparan.

### Misi
1. Menghilangkan redundansi data antara kebutuhan sekolah real dan pelaporan virtual (Dapodik)
2. Memberikan antarmuka yang intuitif bagi tenaga pendidik
3. Menyediakan data historis akademik yang dapat diakses permanen

---

## ✨ Features

- 🔐 **Authentication** — RBAC dengan Supabase Auth
- 📅 **Academic Term** — Manajemen tahun ajaran & semester
- 👨‍🏫 **Guru** — Data guru & pembagian mengajar
- 👨‍🎓 **Siswa** — Data siswa & mutasi
- 🏫 **Kelas** — Dual-layer kelas (REAL + DAPO)
- 📝 **Assessment** — Penilaian & ujian
- 📊 **Rapor** — Generate rapor PDF
- 🔄 **Sync Engine** — Offline-first bidirectional sync

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop App | Tauri v2 |
| Frontend | React 18, TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS v3 |
| State | Zustand, TanStack Query |
| Local DB | Dexie.js (IndexedDB) |
| Cloud DB | Supabase (PostgreSQL) |

---

## 🚀 Getting Started

```bash
# Clone repository
git clone https://github.com/smpn1umbulsari/Kurikulum.git
cd Kurikulum

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development
npm run dev
```

---

## 📁 Project Structure

```
sikad-v4/
├── src/
│   ├── modules/          # Feature modules
│   ├── services/          # Business logic
│   ├── database/          # Database schemas
│   ├── store/             # Zustand stores
│   └── infrastructure/    # Supabase client
├── docs/                  # Documentation
├── supabase/              # Database migrations
└── bin/                   # AETHER CLI
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE) file.

---

<div align="center">

**Built with ❤️ for Indonesian Education**

*SIKAD v4.0 — SMPN 1 Umbulsari*

</div>
