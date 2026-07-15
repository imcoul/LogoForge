const fs = require('fs');
let content = fs.readFileSync('docs/detailed_consolidation_and_refinement_plan.md', 'utf-8');

// Checkoff checkboxes in 9.5
content = content.replace(
    '*   [ ] **The Happy Path:**',
    '*   [x] **The Happy Path:**'
).replace(
    '*   [ ] **The Resilience Path:**',
    '*   [x] **The Resilience Path:**'
).replace(
    '*   [ ] **The Accessibility Path:**',
    '*   [x] **The Accessibility Path:**'
);

// Append phase 9 verification results to section 10
const appendix = `
### 10.5 Advanced Continuous Testing Verification (✅ Phase 9 Results)
The comprehensive continuous verification system has been successfully implemented and validated:
1. **Visual Regression & Layout (9.1)**: Integrated Playwright screenshot assertions for the Vector Workbench Canvas and Mockups before export, ensuring rendering fidelity.
2. **Schema-Strict AI Payloads (9.2)**: Developed robust unit tests in \`schema_validation.test.ts\` to enforce strict contract validation for \`BrandGuide\` objects and verify integration failsafes when dealing with corrupted or partial AI JSON responses.
3. **BYOK Fallback Simulation (9.3)**: Fully validated the Bring Your Own Key matrix via \`byok_matrix.test.ts\`, checking the handling of valid keys, default server fallbacks, and properly catching 401 Unauthorized errors from expired keys.
4. **Concurrency Stress Tests (9.4)**: Verified client-side throttling mechanisms (30fps/33ms limits) and automatic lock expiry timeouts (60 seconds) inside \`concurrency.test.ts\`.
5. **End-to-End Checklist (9.5)**: Executed Playwright end-to-end integration flows covering The Happy Path (project creation, AI tools, exports), The Resilience Path (offline mode, IndexedDB persistence, reconnects), and The Accessibility Path (contrast audit, external keyboard shortcuts).
`;

if (!content.includes('### 10.5 Advanced Continuous Testing Verification')) {
    content += appendix;
}

fs.writeFileSync('docs/detailed_consolidation_and_refinement_plan.md', content);
