# Custom Agent Instructions & Workflow Plan

This file defines the project-specific guidelines, persistence contracts, and development lifecycle rules that all agents working on this project must strictly adhere to.

---

## 1. Dated Plan Files (Migration-Style)

Every new feature, migration, or critical bug fix must begin with a dated markdown plan file in the `plans/` directory named with a timestamp to distinguish multiple plans from the same day: `YYYY-MM-DD-HHMMSS--short-title.md`.

### Plan File Template
```markdown
---
title: "Short Feature Title"
date: YYYY-MM-DD
author: "Ibrahim"
featureId: "feat-1234"
status: "Planned" # Planned | In Progress | Completed & Verified
schemaVersion: 3
relatedPR: ""
storybook: ""
e2eRun: ""
percySnapshot: ""
telemetrySample: ""
---

# Short Feature Title

## Summary
One line summary.

## Plan
- Step 1: ...
- Step 2: ...
- Acceptance Criteria:
  - Functional: ...
  - Persistence: Firestore and Supabase/Postgres must store identical prepared payloads.
  - Telemetry: feature.plan.created

## Implementation Notes
- Files to change:
  - src/components/...
  - src/store.ts
- Persistence contract:
  - Use prepareForFirestore(project) before any write to Firestore or Supabase/Postgres.
  - Compute payloadHash and schemaVersion and include in saved row.
  - If payload size > 900000 bytes, upload chunked object and save backupRef instead.

## Tests
- Unit tests: tests/prepareForFirestore.test.ts
- Integration tests: tests/syncParity.test.ts
- E2E: Playwright test id e2e/feat-1234.spec.ts

## Verification Steps
1. Run unit tests
2. Run integration parity test
3. Run Playwright E2E
4. Confirm telemetry events:
   - feature.implement.completed
   - backup.mirror.success
5. If all pass update status to Completed & Verified and add Findings/fixes

## Findings & Fixes
- (To be filled after verification)

## Audit Trail
- Completed & Verified lines appended here with timestamp and links
```

---

## 2. Canonical Persistence Contracts

1. **`prepareForFirestore` Serializer**: Always use the single canonical serializer located in the store to prune/sanitize payloads before saving.
2. **Quota-Exceeded Graceful Fallbacks**:
   - When Firestore daily write limits are hit, primary cloud sync is suspended safely.
   - **CRITICAL RULE**: Backup mirroring (e.g., Supabase / PostgreSQL) **must still receive updates** even when the primary Firestore sync is suspended. All backup mirrors (`triggerBackupMirror`) must be executed independently of the primary write success/state.

---

## 3. Workflow Rules and Lifecycle

1. **Plan First**: Create a plan file with status `Planned` before changing code.
2. **Implement**: Set status to `In Progress` when implementing.
3. **Verify**: Run build/lint and any target test procedures.
4. **Audit**: Update the status to `Completed & Verified` and append details under the Audit Trail.
