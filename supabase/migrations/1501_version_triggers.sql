CREATE OR REPLACE FUNCTION increment_record_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_inc_version_gurus BEFORE UPDATE ON gurus FOR EACH ROW EXECUTE FUNCTION increment_record_version();
CREATE TRIGGER tr_inc_version_siswas BEFORE UPDATE ON siswas FOR EACH ROW EXECUTE FUNCTION increment_record_version();
CREATE TRIGGER tr_inc_version_assessments BEFORE UPDATE ON assessments FOR EACH ROW EXECUTE FUNCTION increment_record_version();
CREATE TRIGGER tr_inc_version_assessment_details BEFORE UPDATE ON assessment_details FOR EACH ROW EXECUTE FUNCTION increment_record_version();
CREATE TRIGGER tr_inc_version_kehadiran BEFORE UPDATE ON kehadiran FOR EACH ROW EXECUTE FUNCTION increment_record_version();
