/* =========================================================
   SIKAD v4.0 - SECTION 003 - HELPER FUNCTIONS
   ========================================================= */
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
