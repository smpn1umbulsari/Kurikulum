# 29. Artifact Matrix

Matriks ini mendefinisikan kepemilikan dan keterlibatan tim terhadap dokumen/artefak teknis proyek SIKAD v4.0.

- **O (Owner):** Penulis utama dan penanggung jawab kebenaran dokumen.
- **R (Reviewer):** Peninjau dan pemberi masukan.
- **U (User):** Konsumen dokumen untuk referensi kerja.

| Artefak / Peran | BA | SysA | SwArch | DbArch | Developer | QA | DevOps | PM |
|---|---|---|---|---|---|---|---|---|
| **PRD** | **O** | R | R | R | U | U | U | R |
| **TDD** | U | R | **O** | R | U | U | U | I |
| **ERD** | U | U | R | **O** | U | U | I | I |
| **API Spec** | U | **O** | R | R | U | U | I | I |
| **ADR** | I | I | **O** | **O** | U | I | I | I |
| **Test Plan** | U | U | I | I | R | **O** | I | I |
| **Manual Book** | U | U | I | I | U | R | I | **O** |
