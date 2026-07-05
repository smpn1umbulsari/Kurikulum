INSERT INTO permissions (kode, nama, modul) VALUES
('assessments:create', 'Dapat membuat asesmen baru', 'Assessment'),
('assessments:update', 'Dapat mengubah asesmen', 'Assessment'),
('assessments:lock', 'Dapat mengunci draf asesmen', 'Assessment'),
('rapor:finalize', 'Dapat melakukan finalisasi rapor', 'Rapor')
ON CONFLICT (kode) DO NOTHING;
