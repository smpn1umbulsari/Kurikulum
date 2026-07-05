# AETHER PRD COMPLIANCE SYSTEM

## Purpose
AETHER must maintain alignment between PRD documentation and actual implementation. This document defines the workflow for PRD compliance checking.

---

## WORKFLOW

### 1. DAILY COMPLIANCE CHECK (Before Any Work)

```
Before starting any task:
↓
Read current PRD state: docs/00 PRD REVISION LOG.md
↓
Compare with: docs/04-API-Specification.md
            + docs/12-AI-Agents.md
            + Actual implementation files
↓
If mismatch found → CREATE GAP REPORT
↓
If gap affects current task → UPDATE PRD FIRST
↓
Proceed with implementation
```

### 2. ON-DEMAND COMPLIANCE AUDIT

Triggered when:
- New features added
- Bug fixes that change behavior
- Architecture changes
- New migrations created

Command: `aether audit-prd`

### 3. POST-IMPLEMENTATION REPORT

After completing any implementation:
```
1. Document what changed
2. Compare with PRD
3. If different → UPDATE DOCS FIRST
4. Create CHANGELOG entry
5. Mark PRD revision if needed
```

---

## PREREQUISITE: Read This First

Before any work, AETHER must read:

1. **docs/00 PRD REVISION LOG.md** - The source of truth
2. **docs/04-API-Specification.md** - API specifications
3. **docs/12-AI-Agents.md** - Agent responsibilities
4. **docs/17-Security-Hardening.md** - Security requirements

---

## GAP ANALYSIS MATRIX

For each gap found, document:

```markdown
### Gap #[N]: [Title]

**PRD Says:**
[What the documentation states]

**Implementation Has:**
[What actually exists]

**Risk Level:** [HIGH/MEDIUM/LOW]

**Recommendation:**
[UPDATE DOCS / UPDATE CODE / CREATE REVISION]

**Action:**
[Specific steps to resolve]
```

---

## PRD REVISION TRIGGER

A PRD revision is required when:

1. **Architecture Change**
   - New domain introduced
   - Relationship between domains changed
   - New table/column added

2. **Behavior Change**
   - API response format changed
   - Business logic different from spec
   - User flow modified

3. **New Feature**
   - Functionality not in original PRD
   - Enhancement beyond scope

---

## CHANGE REPORT FORMAT

Every change must be documented in `docs/CHANGELOG/`:

```markdown
# CHANGE REPORT: [Short Title]

> **Date:** [YYYY-MM-DD]
> **Author:** AETHER
> **Type:** [FEATURE / FIX / REFACTOR / SECURITY]
> **PRD Alignment:** [ALIGNED / DEVIATION / REVISION NEEDED]

## Summary
[One paragraph description]

## Changes Made

### Code Changes
| File | Change Type | Lines |
|------|-------------|-------|
| [file] | [add/mod/del] | [+N/-N] |

### Documentation Changes
| File | Change Type | Description |
|------|-------------|-------------|
| [file] | [add/mod/del] | [description] |

## PRD Comparison

| Aspect | PRD | Implementation | Status |
|--------|-----|----------------|--------|
| [aspect] | [prd value] | [impl value] | ✅/⚠️/❌ |

## Risks

| Risk | Level | Mitigation |
|------|-------|------------|
| [risk] | [H/M/L] | [mitigation] |

## Sign-off

- [ ] Code matches PRD (or revision created)
- [ ] Documentation updated
- [ ] Tests updated
- [ ] Changelog entry created
```

---

## CURRENT PRD STATE (as of 28 June 2026)

### Core Architecture
```
AUTH → RBAC → ACADEMIC_TERM → MASTER_DATA → PEMBAGIAN_MENGAJAR
     → ASSESSMENT → KEHADIRAN → RAPOR → PROMOTION → GRADUATION → ARCHIVE → ALUMNI
```

### Key Revisions (18 total)
1. ✅ Academic Term sebagai Core Domain
2. ✅ Configurable Assessment Engine (assessment_types)
3. ✅ Guru Identity Unification (auth.users.id = gurus.id)
4. ✅ Kelas Bayangan Dihapus (jenis: REAL/DAPO)
5. ✅ Alumni Hybrid (alumni + alumni_snapshots JSONB)
6. ✅ Snapshot First Strategy
7. ✅ Promotion Engine
8. ✅ Graduation Engine
9. ✅ Sync Engine Formalization (Dexie as operational DB)
10. ✅ Conflict Resolution Center
11. ✅ Monitoring Center
12. ✅ Archive Engine
13. ✅ Rapor Versioning
14. ✅ Device Management (trusted_devices)
15. ✅ Data Retention Policy
16. ✅ New Go Live Requirements
17. ✅ New Production Architecture
18. ✅ Exam Rooming & Invigilation Engine (asesmen_ruangs, asesmen_pesertas, asesmen_pengawases)

---

## ALIGNMENT CHECKLIST

Before completing any task, verify:

- [ ] **PRD-01**: Does this match the PRD revision log?
- [ ] **PRD-02**: Is the API specification updated?
- [ ] **PRD-03**: Is the database schema aligned?
- [ ] **PRD-04**: Are the tests updated?
- [ ] **PRD-05**: Is the CHANGELOG entry created?
- [ ] **PRD-06**: Are all agents notified of the change?

---

## ENFORCEMENT

If implementation deviates from PRD:
1. **STOP** - Do not proceed
2. **DOCUMENT** - Create gap report
3. **DECIDE** - Update PRD or fix implementation
4. **RESOLVE** - Only then proceed

---

**Document Version:** 1.0
**Last Updated:** 28 June 2026
**Owner:** AETHER Platform