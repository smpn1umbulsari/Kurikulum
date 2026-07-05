# 35. ADR (Architecture Decision Record) Governance

ADR digunakan untuk mendokumentasikan keputusan arsitektur penting beserta konteks dan konsekuensinya agar dapat ditelusuri di kemudian hari.

## 1. Struktur ADR
Setiap dokumen ADR wajib menggunakan format standar:
- **Status:** Proposed / Accepted / Rejected / Superceded.
- **Context:** Latar belakang masalah dan alternatif solusi yang dipertimbangkan.
- **Decision:** Solusi terpilih beserta justifikasi teknisnya.
- **Consequences:** Dampak positif/negatif yang timbul akibat keputusan tersebut.

## 2. Alur Pengesahan
- ADR diusulkan oleh Lead Developer atau Architect melalui Pull Request ke folder `docs/ADR/`.
- PR ADR wajib di-review dan disetujui oleh Software/Database Architect sebelum ditandai sebagai *Accepted*.
