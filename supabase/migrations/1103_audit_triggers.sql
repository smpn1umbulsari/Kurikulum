-- Will be attached in triggers category

-- Audit log trigger for calendar events
CREATE TRIGGER tr_academic_calendar_events_audit
  AFTER UPDATE OR DELETE ON academic_calendar_events
  FOR EACH ROW EXECUTE FUNCTION process_audit_trigger();
