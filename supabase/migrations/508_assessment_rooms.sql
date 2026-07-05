-- Migration: 204_assessment_rooms.sql
-- Description: Assessment room management tables with extended fields

-- Add columns to existing exam_rooms table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_rooms' AND column_name = 'lokasi') THEN
        ALTER TABLE exam_rooms ADD COLUMN lokasi TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_rooms' AND column_name = 'is_active') THEN
        ALTER TABLE exam_rooms ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_rooms' AND column_name = 'updated_at') THEN
        ALTER TABLE exam_rooms ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
    END IF;
END $$;

-- Add exam_id column to exam_seats if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_seats' AND column_name = 'exam_id') THEN
        ALTER TABLE exam_seats ADD COLUMN exam_id UUID REFERENCES assessments(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add exam_id and shift columns to exam_supervisors if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_supervisors' AND column_name = 'exam_id') THEN
        ALTER TABLE exam_supervisors ADD COLUMN exam_id UUID REFERENCES assessments(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_supervisors' AND column_name = 'shift') THEN
        ALTER TABLE exam_supervisors ADD COLUMN shift VARCHAR(10) CHECK (shift IN ('SESI1', 'SESI2', 'SESI3'));
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exam_rooms_term_active ON exam_rooms(academic_term_id, is_active);
CREATE INDEX IF NOT EXISTS idx_exam_rooms_nama ON exam_rooms(nama_ruang);
CREATE INDEX IF NOT EXISTS idx_exam_seats_exam ON exam_seats(exam_id) WHERE exam_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exam_seats_room_seat ON exam_seats(room_id, nomor_kursi);
CREATE INDEX IF NOT EXISTS idx_exam_supervisors_slot ON exam_supervisors(slot_waktu, shift);
CREATE INDEX IF NOT EXISTS idx_exam_supervisors_exam ON exam_supervisors(exam_id) WHERE exam_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN exam_rooms.lokasi IS 'Lokasi gedung/lantai/ruang ujian';
COMMENT ON COLUMN exam_rooms.is_active IS 'Status aktif ruangan';
COMMENT ON COLUMN exam_seats.exam_id IS 'ID ujian/asesmen yang terkait';
COMMENT ON COLUMN exam_supervisors.exam_id IS 'ID ujian/asesmen yang diawasi';
COMMENT ON COLUMN exam_supervisors.shift IS 'Shift ujian: SESI1, SESI2, SESI3';