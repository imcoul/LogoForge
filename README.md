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

- **Frontend**: React 18+ with TypeScript, Tailwind CSS, and Framer Motion.
- **Backend**: Express.js server bundled with Vite middleware for development and esbuild for production.
- **Image Processing**: `sharp` for robust server-side image manipulation.
- **State Management**: Custom store implementation with local storage persistence.

## Project Structure

- `/src`: Frontend source code, including components, state management (`store.ts`), and worker scripts (`canvasWorker.ts`).
- `/server.ts`: Backend entry point and API endpoints.
- `/metadata.json`: Application configuration and capabilities.
- `package.json`: Dependency management and build scripts.

## Getting Started

1. **Install dependencies**: `npm install`
2. **Start development server**: `npm run dev`
3. **Build for production**: `npm run build`
4. **Start production server**: `npm run start`

## Technologies Used

- React, Vite, TypeScript
- Tailwind CSS, Framer Motion
- Express.js, Sharp
- Gemini API (Server-side)
