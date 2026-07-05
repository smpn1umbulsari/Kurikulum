INSERT INTO tugas_tambahan_types (kode, nama, kategori, default_jp, aktif) VALUES
('WAKASEK', 'Wakil Kepala Sekolah', 'Struktural', 12.00, TRUE),
('WALIKELAS', 'Wali Kelas', 'Ekuivalen', 2.00, TRUE),
('KALAB', 'Kepala Laboratorium', 'Ekuivalen', 12.00, TRUE)
ON CONFLICT (kode) DO NOTHING;
