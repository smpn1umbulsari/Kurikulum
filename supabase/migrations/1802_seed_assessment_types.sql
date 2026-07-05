INSERT INTO assessment_types (kode, nama, kategori, bobot_default, urutan, aktif) VALUES
('UH', 'Ulangan Harian', 'Formatif', 20.00, 1, TRUE),
('PTS', 'Penilaian Tengah Semester', 'Sumatif', 30.00, 2, TRUE),
('PAS', 'Penilaian Akhir Semester', 'Sumatif', 50.00, 3, TRUE)
ON CONFLICT (kode) DO NOTHING;
