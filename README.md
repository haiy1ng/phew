# Phew

Phew is a motivation-first cleanup app.

Users upload a photo of a messy space and get:
- An AI-generated tidy target image.
- A short, manageable cleanup checklist.
- A gamified progress loop (checklists + XP).

## MVP status
This repo is initialized with a working Next.js MVP scaffold:
- Upload photo
- Generate cleanup plan (`/api/cleanup-plan`)
- Show before/after panel
- Check off micro-tasks with live progress
- Fallback mode when `OPENAI_API_KEY` is missing

Detailed PRD: [docs/mvp-prd.md](docs/mvp-prd.md)

## Stack
- Next.js (App Router)
- TypeScript
- OpenAI APIs (Responses + Images)

## Quick start
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment:
   ```bash
   cp .env.example .env.local
   ```
3. Add your OpenAI API key to `.env.local`:
   ```bash
   OPENAI_API_KEY=...
   ```
4. Start development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000).

## Current file map
- `app/page.tsx`: main MVP UI flow
- `app/api/cleanup-plan/route.ts`: AI plan + clean image endpoint
- `lib/cleanup.ts`: shared types + parsing + fallback plan
- `docs/mvp-prd.md`: detailed MVP PRD

## Notes
- Without `OPENAI_API_KEY`, the app still runs with deterministic fallback tasks.
- Fallback mode reuses the uploaded image as the target image placeholder.
