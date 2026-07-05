CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(100) NOT NULL UNIQUE,
    nama VARCHAR(200) NOT NULL,
    modul VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
