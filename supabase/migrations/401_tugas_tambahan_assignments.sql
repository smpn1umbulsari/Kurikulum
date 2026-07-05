CREATE TABLE IF NOT EXISTS tugas_tambahan_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    guru_id UUID NOT NULL REFERENCES gurus(id) ON DELETE CASCADE,
    tugas_tambahan_type_id UUID NOT NULL REFERENCES tugas_tambahan_types(id) ON DELETE CASCADE,
    nama_penugasan VARCHAR(200) NOT NULL,
    jp_override NUMERIC(5,2),
    status VARCHAR(20) NOT NULL DEFAULT 'AKTIF',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(academic_term_id, guru_id, tugas_tambahan_type_id, nama_penugasan)
);
