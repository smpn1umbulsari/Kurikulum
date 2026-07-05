-- Migration: Sync Delta — updated_at columns and triggers for exam tables
-- Required for delta sync (Phase 4) — pull only records changed since last pull.
-- Safe to run on any environment: uses IF NOT EXISTS for both columns and triggers.

-- ─── exam_rooms ────────────────────────────────────────────────────────────────
ALTER TABLE exam_rooms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE TRIGGER tr_update_exam_room_timestamp
    BEFORE UPDATE ON exam_rooms
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

COMMENT ON COLUMN exam_rooms.updated_at IS 'Updated automatically by trigger — used for delta sync';

-- ─── exam_seats ────────────────────────────────────────────────────────────────
ALTER TABLE exam_seats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE TRIGGER tr_update_exam_seat_timestamp
    BEFORE UPDATE ON exam_seats
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

COMMENT ON COLUMN exam_seats.updated_at IS 'Updated automatically by trigger — used for delta sync';

-- ─── exam_supervisors ─────────────────────────────────────────────────────────
ALTER TABLE exam_supervisors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE TRIGGER tr_update_exam_supervisor_timestamp
    BEFORE UPDATE ON exam_supervisors
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

COMMENT ON COLUMN exam_supervisors.updated_at IS 'Updated automatically by trigger — used for delta sync';

-- ─── Indexes for delta sync query performance ───────────────────────────────────
-- Partial indexes on updated_at for large tables
CREATE INDEX IF NOT EXISTS idx_exam_rooms_updated_at ON exam_rooms(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_seats_updated_at ON exam_seats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_supervisors_updated_at ON exam_supervisors(updated_at DESC);
