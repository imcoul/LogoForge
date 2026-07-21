---
title: "Production Architecture Migration Plan"
date: 2026-07-21
author: "AI Assistant"
featureId: "infra-032"
status: "Planned"
schemaVersion: 3
relatedPR: ""
storybook: ""
e2eRun: ""
percySnapshot: ""
telemetrySample: ""
---

# Production Architecture Migration & Scaling Plan

## Summary
A comprehensive, multi-phase roadmap to transition from the current Firestore MVP to a production-ready, multi-database architecture (Supabase PostgreSQL + Cloudflare Durable Objects + Yjs + S3). This plan details migration checklists, parity checks, Durable Objects integration, and a step-by-step Firestore-to-Supabase migration script.

## Plan

### Phase 1: Migration Decision & Parity Scaffolding (Free-First)
- Step 1.1: Implement a migration decision checklist. This will monitor WebRTC failure rates, CRDT conflict rates, and payload sizes to trigger the next phase.
- Step 1.2: Add a Parity CI Job (`scripts/checkParity.ts`) to guarantee identical hashing between local IndexedDB snapshots, Firestore, and Supabase backup states.
- Step 1.3: Refine the `prepareForFirestore` serializer to ensure payloads are perfectly sanitized for both Firestore and PostgreSQL JSONB columns.

### Phase 2: Firestore to Supabase (PostgreSQL) Migration Script
- Step 2.1: Scaffold `scripts/migrateFirestoreToSupabase.ts`.
- Step 2.2: The script will iterate through the `projects` collection in Firestore.
- Step 2.3: For each project, it validates the schema, computes `payloadHash`, and executes an upsert into Supabase via its REST API (or Postgres driver) utilizing the `backupRef` for large blobs.
- Step 2.4: Execute dry runs and verify data consistency.

### Phase 3: Cloudflare Durable Objects Pilot (Real-Time Canvas Engine)
- Step 3.1: Initialize a Cloudflare Worker project for the Durable Objects pilot.
- Step 3.2: Design the WebSocket message payload structure (e.g., `{ type: 'yjs-sync' | 'awareness', payload: Base64, clientId, timestamp }`).
- Step 3.3: Implement warm-up mitigation strategies (e.g., heartbeat pings, caching recent vectors in memory).
- Step 3.4: Connect a test project file to the Durable Object WebSocket relay instead of purely peer-to-peer Yjs.

### Phase 4: S3 / Supabase Storage for Binary Assets
- Step 4.1: Eliminate Base64 blobs from the canonical database JSON.
- Step 4.2: Setup pre-signed URL generation for uploading/downloading heavy assets (images, fonts).

## Implementation Notes
- Files to create/modify:
  - `scripts/checkParity.ts`
  - `scripts/migrateFirestoreToSupabase.ts`
  - `workers/durableObjectRelay.ts` (Pilot)
- Persistence contract:
  - Yjs updates appended to local IndexedDB.
  - Periodic prepared snapshots pushed to Supabase JSONB.
  - Large assets strictly routed to object storage.

## Tests
- Unit tests: `tests/migration.test.ts` to validate payload transformation.
- Integration tests: `tests/syncParity.test.ts` to ensure Firestore and Supabase hashes match.
- E2E: Playwright test verifying a seamless transition between local, peer-to-peer, and relay collaboration modes.

## Verification Steps
1. Run CI Parity checks on mocked payloads.
2. Execute the Firestore-to-Supabase migration script in `--dry-run` mode.
3. Deploy the Durable Object pilot and connect 5 simulated clients to measure latency and cold start times.
4. Confirm telemetry events: `migration.dryrun.success`, `durable_object.connected`.
5. Update status to `Completed & Verified` once approved and executed.

## Findings & Fixes
- (To be filled after verification)

## Audit Trail
- (To be appended upon completion)
