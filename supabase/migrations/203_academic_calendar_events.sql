-- Migration: 203_academic_calendar_events.sql
-- Description: Academic calendar events table for RPE (Realistic Processing Education) calculation

CREATE TABLE IF NOT EXISTS academic_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_term_id UUID REFERENCES academic_terms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('national_holiday', 'school_event', 'exam', 'break')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON academic_calendar_events(date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_year ON academic_calendar_events(academic_term_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON academic_calendar_events(type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_active ON academic_calendar_events(is_active) WHERE is_active = true;

-- Comments
COMMENT ON TABLE academic_calendar_events IS 'Academic calendar events for RPE calculation';
COMMENT ON COLUMN academic_calendar_events.type IS 'Event type: national_holiday, school_event, exam, break';
COMMENT ON COLUMN academic_calendar_events.is_active IS 'Soft delete flag - false means archived';

-- RLS Policies for kurikulum role
CREATE POLICY "Kurikulum can view calendar events" ON academic_calendar_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.kode = 'URUSAN'
    )
  );

CREATE POLICY "Kurikulum can insert calendar events" ON academic_calendar_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.kode = 'URUSAN'
    )
  );

CREATE POLICY "Kurikulum can update calendar events" ON academic_calendar_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.kode = 'URUSAN'
    )
  );

CREATE POLICY "Kurikulum can delete calendar events" ON academic_calendar_events
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.kode = 'URUSAN'
    )
  );


