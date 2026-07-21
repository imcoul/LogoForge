---
title: "Connect Free Models and UI Audit"
date: 2026-07-21
featureId: "infra-031"
status: "Completed & Verified"
schemaVersion: 3
relatedPR: ""
storybook: ""
e2eRun: ""
percySnapshot: ""
telemetrySample: "feature.completedverified"
---

# Connect Free Models and UI Audit

## Summary
Implements a secure, robust model registry with custom fallbacks, startup validation, request-level provenance, and feature flags. Conducts a per-screen responsiveness/overflow audit on key components.

## Plan
- **Step 1**: Add central model registry `src/config/modelRegistry.ts` detailing entries `{ id, name, envKey, capabilities, recommendedTasks, fallbackOrder }`.
- **Step 2**: Add connected free models fallback and secrets startup validation contract to `src/server/geminiRouter.ts` (requires `STEPFUN_API_KEY`, `POOLSIDE_API_KEY`, `TENCENT_API_KEY` in environment variables and validates them gracefully at boot).
- **Step 3**: Introduce feature flags gating (`ENABLE_STEPFUN`, `ENABLE_POOLSIDE`, `ENABLE_TENCENT`, `ENABLE_GEMINI` feature flags) and allow toggles in .env.example.
- **Step 4**: Implement per-request provenance metadata, embedding `meta.model = { id, name, version, promptHash, temperature }` and `generationId` inside API responses.
- **Step 5**: Create comprehensive unit tests (`src/tests/unit/modelRegistry.test.ts`) covering feature gates, API key validations, header routing (`X-Model-Preference`), and fallback policy.
- **Step 6**: Perform a responsive/overflow UI audit across all views.

## Persistence Contract
- All operations preserve the canonical state and attach provenance metadata.
- Third-party secrets are isolated safely on the server side and never persist raw in DB or leaks to client.

## Tests
- Unit: `src/tests/unit/modelRegistry.test.ts` validates custom API key checks, feature gating, fallback routing, and metadata attachment.

## Verification Steps
1. Run server startup validations to confirm keys loaded correctly.
2. Run targeted model registry test suite with Vitest.
3. Validate linter and production compiler.

## Findings & Fixes
- **Startup Warning Check**: Safely prints logs without crashing the server if specific API keys are omitted.
- **Header Parsing**: Added lowercase matching support for both legacy `x-active-model` and new `x-model-preference` headers.
- **UI Overflow Findings**:
  - **Dashboard.tsx**: Action buttons have responsive modifiers `opacity-100 md:opacity-0` to remain perfectly interactive on mobile touch screens without hover.
  - **Studio.tsx**: SVG toolbars wrap gracefully to prevent overflows.
  - **Settings.tsx**: Input forms utilize layout wrappers to fit snugly on screens down to 320px.

## Audit Trail
- 2026-07-21 - Feature completed, verified via comprehensive unit tests, linted, and compiled cleanly. Ibrahim.
