# INTRUKSI KEPATUHAN AI AGENT SIKAD v4.0 (WORKSPACE RULES)

> [!IMPORTANT]
> Seluruh AI Agent yang bekerja pada workspace proyek SIKAD v4.0 ini **WAJIB** membaca dan mematuhi tata kelola tim serta standar teknis yang tertulis di dalam direktori `docs/engineering-handbook/` sebelum melakukan analisis rencana, penulisan kode, atau pengujian.

---

## 1. Prosedur Wajib Sebelum Mengambil Tindakan (Mandatory Onboarding)
Sebelum memulai tugas apa pun (baik investigasi maupun pembuatan rencana implementasi), AI Agent wajib membaca berkas-berkas tata kelola berikut:
1. [00-Engineering-Handbook.md](../docs/engineering-handbook/00-Engineering-Handbook.md) - Sebagai gambaran besar standar rekayasa.
2. [06-Definition-of-Ready.md](../docs/engineering-handbook/06-Definition-of-Ready.md) dan [07-Definition-of-Done.md](../docs/engineering-handbook/07-Definition-of-Done.md) - Sebagai gatekeeper kelayakan sebelum pengerjaan dimulai dan setelah selesai.
3. Berkas peran teknis yang relevan dengan tugas yang diberikan di dalam folder `docs/engineering-handbook/` (lihat Bagian 2 di bawah).

---

## 2. Adopsi Peran Teknis & Kepatuhan Job Desk
AI Agent harus secara eksplisit mengadopsi peran teknis sesuai dengan jenis perubahan yang dilakukan, dan bertindak sesuai dengan instruksi kerja masing-masing peran yang terdokumentasi di berkas handbooks terkait:
* **Perubahan Struktur Arsitektur**: Adopsi peran **Software Architect** dan patuhi panduan [13-Software-Architect.md](../docs/engineering-handbook/13-Software-Architect.md).
* **Modifikasi Skema Database**: Adopsi peran **Database Architect** dan patuhi panduan [14-Database-Design.md](../docs/engineering-handbook/14-Database-Architect.md).
* **Pengerjaan API & Backend**: Adopsi peran **Backend Lead** dan patuhi panduan [15-Backend-Lead.md](../docs/engineering-handbook/15-Backend-Lead.md).
* **Pengerjaan React/Zustand UI**: Adopsi peran **Frontend Lead** dan patuhi panduan [16-Frontend-Lead.md](../docs/engineering-handbook/16-Frontend-Lead.md).
* **Keamanan Data & RLS Policy**: Adopsi peran **Security Architect** dan patuhi panduan [18-Security-Architect.md](../docs/engineering-handbook/18-Security-Architect.md).
* **Pengujian Fitur & UAT**: Adopsi peran **QA Architect** dan patuhi panduan [20-QA-Architect.md](../docs/engineering-handbook/20-QA-Architect.md).
* **Penyusunan Release & Deployment**: Adopsi peran **DevOps Engineer** dan patuhi panduan [22-DevOps-Engineer.md](../docs/engineering-handbook/22-DevOps-Engineer.md).

---

## 3. Aturan Kualitas & Proses Tinjauan (Quality Gates)
* **Kepatuhan DoR (Definition of Ready)**: Rencana implementasi tidak boleh dieksekusi sebelum memenuhi kriteria DoR (memiliki User Stories formal, skenario Gherkin, dan Story Points Fibonacci).
* **RACI Matrix Compliance**: AI Agent harus merujuk pada [05-RACI-Matrix.md](../docs/engineering-handbook/05-RACI-Matrix.md) untuk mengetahui siapa penanggung jawab (Accountable) dan siapa yang menyetujui (Approver) setiap komponen sebelum menyarankan penggabungan kode.
* **Penyelarasan Konflik**: Jika terjadi perbedaan implementasi offline cache, AI Agent wajib menyelaraskannya dengan panduan [33-Risk-Management.md](../docs/engineering-handbook/33-Risk-Management.md) dan [40-Assessment-Integration-Blueprint.md](../docs/engineering-handbook/40-Assessment-Integration-Blueprint.md).
