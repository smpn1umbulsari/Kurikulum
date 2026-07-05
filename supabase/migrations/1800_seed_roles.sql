INSERT INTO roles (kode, nama) VALUES
('SUPERADMIN', 'Super Administrator'),
('ADMIN', 'Administrator Sekolah'),
('URUSAN', 'Urusan Kurikulum'),
('KEPALA_SEKOLAH', 'Kepala Sekolah'),
('BK', 'Bimbingan Konseling'),
('GURU', 'Guru Mata Pelajaran')
ON CONFLICT (kode) DO NOTHING;
