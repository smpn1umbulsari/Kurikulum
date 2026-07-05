CREATE TABLE IF NOT EXISTS alumni (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID NOT NULL UNIQUE REFERENCES siswas(id) ON DELETE RESTRICT,
    nisn VARCHAR(20),
    nipd VARCHAR(20),
    nama VARCHAR(150) NOT NULL,
    jk CHAR(1),
    agama VARCHAR(20),
    tahun_lulus INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
