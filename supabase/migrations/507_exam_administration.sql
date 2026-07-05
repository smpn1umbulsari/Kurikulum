-- Migration: Exam Administration Tables
CREATE TABLE exam_rooms (
    id UUID PRIMARY KEY,
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    nama_ruang TEXT NOT NULL,
    kapasitas INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE exam_seats (
    id UUID PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES exam_rooms(id) ON DELETE CASCADE,
    siswa_id UUID NOT NULL REFERENCES siswas(id) ON DELETE CASCADE,
    nomor_kursi INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (room_id, nomor_kursi),
    UNIQUE (room_id, siswa_id)
);

CREATE TABLE exam_supervisors (
    id UUID PRIMARY KEY,
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    guru_id UUID NOT NULL REFERENCES gurus(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES exam_rooms(id) ON DELETE CASCADE,
    slot_waktu TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (guru_id, academic_term_id, slot_waktu)
);

-- Enable RLS
ALTER TABLE exam_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_supervisors ENABLE ROW LEVEL SECURITY;

-- Policies for exam_rooms
CREATE POLICY "Allow select exam_rooms for all authenticated"
    ON exam_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow edit exam_rooms for admin and kurikulum"
    ON exam_rooms FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.kode IN ('SUPERADMIN', 'ADMIN', 'URUSAN'))
    );

-- Policies for exam_seats
CREATE POLICY "Allow select exam_seats for all authenticated"
    ON exam_seats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow edit exam_seats for admin and kurikulum"
    ON exam_seats FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.kode IN ('SUPERADMIN', 'ADMIN', 'URUSAN'))
    );

-- Policies for exam_supervisors
CREATE POLICY "Allow select exam_supervisors for all authenticated"
    ON exam_supervisors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow edit exam_supervisors for admin and kurikulum"
    ON exam_supervisors FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.kode IN ('SUPERADMIN', 'ADMIN', 'URUSAN'))
    );
