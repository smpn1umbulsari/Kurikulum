-- Migration: Calendar Events table
CREATE TYPE calendar_category AS ENUM ('LIBUR', 'UJIAN', 'KEGIATAN', 'UMUM');

CREATE TABLE calendar_events (
    id UUID PRIMARY KEY,
    academic_term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    category calendar_category NOT NULL DEFAULT 'UMUM',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Policies: Select allowed for all authenticated users
CREATE POLICY "Allow select calendar_events for all authenticated" 
    ON calendar_events FOR SELECT TO authenticated USING (true);

-- Policies: Admin & Kurikulum can insert/update/delete
CREATE POLICY "Allow edit calendar_events for admin and kurikulum"
    ON calendar_events FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.kode IN ('SUPERADMIN', 'ADMIN', 'URUSAN')
        )
    );
