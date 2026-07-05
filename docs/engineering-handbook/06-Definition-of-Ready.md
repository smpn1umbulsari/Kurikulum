# 06. Definition of Ready (DoR)

Sebuah item backlog atau tiket pekerjaan dinyatakan **Ready** untuk masuk ke tahap Development jika memenuhi kriteria berikut:

1. **Deskripsi Jelas:** Memiliki format User Story yang jelas: *"Sebagai [peran], saya ingin [tindakan], sehingga [manfaat]"*.
2. **Kriteria Penerimaan (Acceptance Criteria):** Minimal terdapat 3 skenario pengujian dengan format Gherkin (*Given-When-Then*).
3. **Desain UI Disetujui (Jika ada dampak UI):** Tautan ke Figma/Tauri wireframe yang berstatus *Approved* oleh UI/UX Architect.
4. **Skema Database & API Ready:** Skema tabel (PostgreSQL/Dexie) dan API Spec telah didefinisikan dan disetujui oleh Architect.
5. **Dependensi Teridentifikasi:** Tidak ada *blocker* dari fitur atau modul lain yang sedang dikembangkan.
6. **Estimasi Ukuran Tugas:** Tugas telah diperkirakan bobotnya (Story Points) oleh tim developer.
