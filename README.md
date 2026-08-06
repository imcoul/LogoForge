# Forgel - Brand Identity Operating System

Forgel is an AI-powered brand identity operating system designed to bridge the gap between creative drafting and production-ready brand assets. It provides a comprehensive, sandboxed environment for designers to create, audit, and manage high-fidelity design prototypes, typographic composition, and visual-audio assets.

## Features

- **Prompt-Driven Drafting**: Generate and draft vector branding marks using an advanced, prompt-driven canvas.
- **Precision Tooling**: Robust SVG path editing capabilities for refining anchor points and design details.
- **High-Performance Rendering**: Utilizes Offscreen Canvas and Web Workers for efficient, background-processed vector grading and rendering.
- **Server-Side Processing**: Leverages server-side image processing with `sharp` to handle complex SVG-to-PNG exports that might exceed client-side memory limits.
- **Project Management**: Built-in dashboard to manage multiple brand projects with bulk selection and deletion capabilities.
- **AI Integration**: Powered by the Gemini API for intelligent design assistance (server-side).

## Architecture

Forgel is a full-stack application built with:

- **Frontend**: React 19 with TypeScript, Tailwind CSS v4, and Motion.
- **Backend**: Express.js server bundled with Vite middleware for development and esbuild for production.
- **Image Processing**: `sharp` for robust server-side image manipulation.
- **State Management**: Zustand, persisted to IndexedDB (`idb-keyval`) and mirrored to Firestore, with optional Supabase/PostgreSQL backup.

## Project Structure

- `/src`: Frontend source code, including components, state management (`store.ts`), and worker scripts (`canvasWorker.ts`).
- `/src/engine`: Pure, dependency-free document logic (SVG parsing and serialization).
- `/src/tests`: Unit, integration and characterization tests.
- `/server.ts`: Backend entry point and API endpoints.
- `/plans`: Dated plan files and recorded baseline metrics (see `AGENTS.md`).
- `/metadata.json`: Application configuration and capabilities.
- `package.json`: Dependency management and build scripts.

## Getting Started

1. **Install dependencies**: `npm install`
2. **Start development server**: `npm run dev`
3. **Build for production**: `npm run build`
4. **Start production server**: `npm run start`

## Quality gates

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | TypeScript, no emit. Must report 0 errors. |
| `npm run lint` | ESLint. The error count must never increase. |
| `npm run test:run` | Vitest suite. |
| `npm run test:coverage` | Vitest with coverage thresholds enforced. |
| `npm run verify` | All of the above, in order. |

Baseline metrics are recorded in `plans/baseline.json`; later work is compared against them.

### Characterization tests

`src/tests/characterization/` pins the **current** behaviour of subsystems scheduled for
replacement — including their known bugs, which are labelled `KNOWN BUG` / `KNOWN LIMITATION`.
These are not specifications of correct behaviour. When a planned rewrite lands, the affected
tests are expected to fail; that failure is the signal the fix worked, and the assertions
should then be updated to the correct values.

## Technologies Used

- React 19, Vite, TypeScript
- Tailwind CSS v4, Motion
- Zustand, IndexedDB, Firebase/Firestore, Supabase
- Express.js, Sharp
- Gemini API (Server-side) with a multi-model fallback registry
