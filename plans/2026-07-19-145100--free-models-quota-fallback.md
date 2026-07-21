---
title: "Fallback to Connected Free Models on Quota Limits"
date: 2026-07-19
author: "AI"
featureId: "feat-free-models-fallback"
status: "Completed & Verified"
schemaVersion: 3
relatedPR: ""
storybook: ""
e2eRun: ""
percySnapshot: ""
telemetrySample: ""
---

# Fallback to Connected Free Models on Quota Limits

## Summary
When the primary Gemini API model hits quota limits (e.g. RESOURCE_EXHAUSTED / 429), the application should dynamically fall back to any third-party free model presets that the user has connected (StepFun, Poolside, Tencent) if keys are provided in the request headers or environment. If no custom keys are provided, it will fall back to the standard free tier 'gemini-3.5-flash'.

## Plan
- Step 1: Create a unified helper function `callCustomModel` in `src/server/geminiRouter.ts` to execute custom model calls in a structured format.
- Step 2: Refactor the primary custom model path to use `callCustomModel` directly.
- Step 3: Implement fallback detection inside `generateAIContent` when Gemini hits a quota error:
  - Check for the existence of `x-stepfun-key` (or process.env.STEPFUN_API_KEY).
  - Check for the existence of `x-poolside-key` (or process.env.POOLSIDE_API_KEY).
  - Check for the existence of `x-tencent-key` (or process.env.TENCENT_API_KEY).
  - Attempt falling back to the first available connected custom free model.
  - If all connected free models are missing or fail, fall back to the standard free model `gemini-3.5-flash`.
- Step 4: Run `lint_applet` and `compile_applet` to verify correctness.
- Step 5: Update the plan status to Completed & Verified.

## Implementation Notes
- Files to change:
  - src/server/geminiRouter.ts

## Verification Steps
1. Run compilation and linting to guarantee type-safety.
2. Confirm the server restarts and builds successfully.

## Findings & Fixes
- **Modular Custom LLM Helper**: Created `callCustomModel` as a reusable helper to fetch OpenAI-compatible endpoints with custom models.
- **Dynamic Multi-Engine Fallback**: Whenever Gemini throws a `Quota exceeded` (RESOURCE_EXHAUSTED/429) error, the server-side router inspects all request headers and system environment variables for user-connected free models in priority order (`StepFun -> Poolside -> Tencent`). If any of them are configured, they are automatically engaged as fallback proxies.
- **Fail-safe Native Free Tier**: If no custom presets are connected or if they encounter errors, the router automatically attempts a final graceful fallback to Google's standard free tier text model (`gemini-3.5-flash`).

## Audit Trail
- **2026-07-19**: Fallback logic completed and verified successfully with zero errors across linting (`lint_applet`) and building (`compile_applet`). Saved configuration active.

