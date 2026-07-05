# 05. RACI Matrix

Matriks RACI ini menetapkan akuntabilitas di setiap tahapan siklus hidup pengembangan SIKAD v4.0.

- **R (Responsible):** Pelaksana tugas.
- **A (Accountable):** Penanggung jawab akhir (pengambil keputusan utama).
- **C (Consulted):** Pihak yang dimintai masukan/saran.
- **I (Informed):** Pihak yang diinfokan setelah keputusan/tugas selesai.

| Tahapan / Peran | HOP | PM | PO | BA | SysA | SwArch | DbArch | BE/FE Lead | QA | DevOps | CS | DAn |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Discovery** | **A** | C | **R** | **R** | I | I | I | I | I | I | C | I |
| **Analysis (PRD)** | I | C | **A** | **R** | **R** | C | C | I | I | I | C | I |
| **Design (TDD/ERD)** | I | C | I | I | C | **A** | **R** | **R** | C | I | I | **R** |
| **Development** | I | C | I | I | I | C | C | **R** | I | I | I | I |
| **Testing & QA** | I | I | I | I | I | I | I | C | **R** | I | I | I |
| **Deployment** | I | C | I | I | I | I | I | I | I | **R** | I | I |
| **Maintenance** | I | **A** | I | I | I | I | I | C | I | **R** | **R** | I |
| **ADR & RFC** | **A** | C | I | I | I | **R** | **R** | C | I | I | I | I |
| **AI Validation Gate** | I | I | I | I | I | **A** | I | **R** | **R** | I | I | I |
| **User Training & Adoption**| I | C | **A** | I | I | I | I | I | I | I | **R** | I |
| **BI & Analytics Design**  | I | I | **A** | C | C | I | I | I | I | I | I | **R** |

