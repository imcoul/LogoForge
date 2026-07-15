# Forgel Continuous Testing & Validation Framework

This framework implements the Advanced Continuous Testing & Validation Framework as defined in the consolidation plan.

## Structure
- `/src/tests/unit/`: Logic, Schema, and Payload validation.
- `/src/tests/stress/`: Concurrency and performance benchmarks.
- `/e2e-tests/`: End-to-End integration tests using Playwright.

## Categories
1. **Visual Regression**: Verified via Playwright screenshots.
2. **Schema Assertion**: Payload validation for AI generated content (located in `src/tests/unit`).
3. **BYOK Matrix**: Test suites for API key fallback strategies.
4. **Concurrency Stress**: Performance benchmarks in `src/tests/stress`.
5. **E2E Integration**: Critical user journeys in `/e2e-tests`.
