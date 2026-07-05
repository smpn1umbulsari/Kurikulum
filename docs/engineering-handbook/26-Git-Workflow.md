# 26. Git Workflow

Alur kerja Git SIKAD v4.0 menggunakan model Git Flow yang disederhanakan untuk mendukung integrasi berkelanjutan (CI/CD).

## 1. Format Commit (Conventional Commits)
Setiap commit wajib menggunakan format:
```text
<type>(<scope>): <subject>
```
- **feat:** Fitur baru (contoh: `feat(assessment): add finalize grading sheet`).
- **fix:** Perbaikan bug (contoh: `fix(sync): solve concurrency conflict on attendance`).
- **docs:** Dokumentasi (contoh: `docs(handbook): update git workflow`).
- **refactor:** Perbaikan struktur kode tanpa mengubah fungsi (contoh: `refactor(db): split repository class`).
- **test:** Penambahan unit/integration test.

## 2. Aturan Pull Request (PR)
- PR harus memiliki deskripsi tentang fitur yang ditambahkan/diperbaiki.
- PR harus menyertakan bukti screenshot/video jika ada perubahan visual UI.
- Semua tes otomatis di CI/CD pipeline wajib berstatus *Passed* sebelum PR direview.
