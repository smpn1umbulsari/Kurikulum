# 37. Quality Gates

Quality Gates menetapkan ambang batas kualitas otomatis yang wajib dilewati sebelum kode digabungkan ke cabang utama.

## 1. Ambang Batas Otomatis (CI Pipeline Gates)

| Parameter | Ambang Batas | Tindakan Jika Gagal |
|---|---|---|
| **TypeScript Compilation** | Lulus Tanpa Error | PR Diblokir |
| **Linting Checks** | Lulus Tanpa Error | PR Diblokir |
| **Unit Test Coverage** | Minimal 80% | PR Diblokir |
| **Security Scanning** | 0 High Vulnerability | Deployment Dibatalkan |
| **Tauri Installer Build** | Berhasil Compile | Release Diblokir |

## 2. Pemantauan Manual (QA Gates)
- Pengujian kompatibilitas offline diuji pada minimal 2 perangkat fisik berspesifikasi rendah.
- Lulus verifikasi integrasi skema data Dapodik (Dapodik Mapper).
