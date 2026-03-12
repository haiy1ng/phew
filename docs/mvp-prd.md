# Phew MVP PRD

- Product: **Phew**
- Version: **MVP v0.1**
- Date: **March 12, 2026**
- Status: **Draft for build kickoff**

## 1) Product Summary
Phew helps users clean cluttered spaces without overwhelm. A user uploads a photo of a messy area (for example, a work desk), sees an AI-generated tidy target image, and receives small, concrete cleanup tasks they can check off in sequence. The core loop combines motivation (before/after vision) with manageable action (micro-tasks + gamified progress).

## 2) Problem Statement
People often delay cleaning because:
- The mess feels emotionally heavy and cognitively expensive.
- They do not know where to start.
- They struggle to sustain momentum once they begin.

Current generic to-do apps do not convert visual clutter into actionable cleanup steps tailored to a specific space.

## 3) Target Users
### Primary persona: Overwhelmed knowledge worker
- Environment: Home office or desk-heavy work setup.
- Pain points: Visual clutter hurts focus; procrastinates cleanup.
- Need: Fast direction with low mental load.

### Secondary persona: Student in shared living space
- Environment: Small bedroom/desk with mixed personal and school items.
- Pain points: Limited storage and frequent buildup.
- Need: Short sessions and immediate wins.

## 4) Jobs To Be Done
- When my room or desk gets messy and I feel stuck, help me start with tiny steps so I can clean without stress.
- Show me what “done enough” looks like so I stay motivated.

## 5) MVP Goals
1. Convert one uploaded mess photo into:
   - A clean target visual.
   - A prioritized micro-task plan (5-8 tasks, 2-15 minutes each).
2. Support completion tracking in one cleanup session.
3. Increase user confidence and momentum through visible progress and lightweight rewards.

## 6) Non-Goals (MVP)
- Multi-room project planning.
- Social/community features.
- AR overlays, live camera guidance, or object detection precision.
- Native mobile apps.
- Advanced habit analytics or long-term coaching.

## 7) Success Metrics
### Activation
- % of new users who upload a photo and generate a plan in first session.
- MVP target: **>= 70%**.

### Core engagement
- % of sessions with at least one task checked.
- MVP target: **>= 65%**.

### Completion
- % of generated plans with >= 60% tasks completed in-session.
- MVP target: **>= 40%**.

### Motivation proxy
- % of users who report “less overwhelmed” in optional 1-click post-session prompt.
- MVP target: **>= 60% positive**.

## 8) User Journey (Primary Flow)
1. User lands on home screen.
2. User uploads a photo of messy space.
3. User selects space type (desk, bedroom, kitchen, etc.).
4. User taps “Generate tidy version + task cards”.
5. App shows:
   - Before image.
   - AI clean target image.
   - Scene summary + encouragement.
   - Ordered task cards with estimate + XP reward.
6. User starts cleanup and checks tasks as completed.
7. Progress bar, completion count, and XP update live.
8. User reaches completion milestone and sees a concise success state.

## 9) Functional Requirements
### FR-1 Upload and input
- User can upload one image file (`jpg`, `jpeg`, `png`, `webp`) up to 10 MB.
- User can pick a space type.
- Validation errors are clear and recoverable.

Acceptance criteria:
- Invalid file type or missing file blocks generation with clear message.
- Valid upload proceeds in <= 1 click after selection.

### FR-2 AI cleanup plan generation
- Backend accepts base64 image and context.
- LLM returns structured JSON containing:
  - `sceneSummary`
  - `encouragement`
  - `tasks[]` (title, instructions, estimatedMinutes, rewardPoints)
- Tasks are normalized and capped (5-8 max for MVP UI).

Acceptance criteria:
- Every response surfaces at least 5 tasks.
- Every task has actionable instruction and duration estimate.

### FR-3 AI tidy vision image
- Backend requests a clean target image based on analyzed scene.
- UI renders generated target image next to uploaded image.
- If image generation fails, app gracefully falls back and still provides tasks.

Acceptance criteria:
- User always receives a usable task plan, even on partial AI failure.

### FR-4 Task execution and tracking
- Tasks display as checkable cards.
- Checking/unchecking updates:
  - Completed count
  - Progress %
  - XP earned

Acceptance criteria:
- State updates instantly with no page reload.

### FR-5 Motivation layer
- Display lightweight progress reinforcement:
  - Progress bar
  - XP chip
  - Encouragement text
- Keep language non-judgmental and action-oriented.

Acceptance criteria:
- User can infer what to do next without additional instructions.

## 10) UX Principles
- **Low cognitive load first**: one clear CTA, no dense control surfaces.
- **Momentum over perfection**: emphasize partial progress.
- **Immediate visual feedback**: before/after appears in same view.
- **Manageable chunks**: short tasks and visible time estimates.

## 11) MVP Scope In / Out
### In scope
- Single-page web app.
- One-photo analysis per session.
- AI plan + AI tidy image generation.
- Checklist + progress + XP.
- Basic fallback behavior when API unavailable.

### Out of scope
- Authentication/accounts.
- History sync across devices.
- Billing/paywall.
- Push notifications.
- Team/shared cleanup sessions.

## 12) System Design (MVP)
### Frontend
- Next.js App Router UI.
- Local state for session data and checklist progress.
- Responsive desktop/mobile layout.

### Backend
- Next.js route handler: `POST /api/cleanup-plan`.
- Calls:
  - OpenAI Responses API for scene understanding + micro-task JSON.
  - OpenAI Images API for tidy target generation.
- Normalizes model output and returns stable response schema.

### Fallback strategy
- If no `OPENAI_API_KEY` or AI request failure:
  - Return deterministic mock cleanup plan.
  - Reuse uploaded image as placeholder target.
  - Continue full task-checking experience.

## 13) API Contract (Current)
### Request
`POST /api/cleanup-plan`

```json
{
  "imageDataUrl": "data:image/png;base64,...",
  "focus": "desk"
}
```

### Response
```json
{
  "sceneSummary": "...",
  "encouragement": "...",
  "cleanImageUrl": "https://... or data:image/...",
  "tasks": [
    {
      "id": "1",
      "title": "Clear visible trash",
      "instructions": "...",
      "estimatedMinutes": 4,
      "rewardPoints": 10
    }
  ],
  "isMock": false
}
```

## 14) Data Model (Session-level)
For MVP, data is ephemeral (in-memory UI state).

Entity: `CleanupSession`
- `sessionId` (future)
- `uploadedImageRef`
- `cleanImageRef`
- `sceneSummary`
- `encouragement`
- `tasks[]`
- `startedAt`, `completedAt` (future)

Entity: `CleanupTask`
- `id`
- `title`
- `instructions`
- `estimatedMinutes`
- `rewardPoints`
- `done` (client state)

## 15) Analytics Events (MVP)
- `upload_selected`
- `plan_generation_started`
- `plan_generation_succeeded`
- `plan_generation_failed`
- `task_checked`
- `task_unchecked`
- `session_progress_updated`
- `session_completed` (100% tasks)

## 16) Trust, Safety, and Privacy
- Do not store user photos in MVP by default.
- Process images only for immediate inference and generation.
- Add clear note that outputs are AI-generated and may not perfectly reflect physical constraints.
- Avoid judgmental or shaming language in model prompts and UI copy.

## 17) Non-Functional Requirements
- End-to-end generation target: <= 12 seconds median on broadband.
- App should remain usable when image generation fails.
- Mobile-first responsive behavior for >= 360px width.
- Accessibility baseline:
  - Keyboard-operable checklist.
  - Semantic labels for file input and checkboxes.
  - Sufficient text contrast.

## 18) QA and Test Plan
- Unit tests (next phase): output normalization and JSON parsing helpers.
- Integration tests (next phase): `/api/cleanup-plan` success/fallback/error paths.
- Manual smoke:
  - Upload valid image.
  - Upload invalid file.
  - Generate plan with and without API key.
  - Check/uncheck all tasks.
  - Verify mobile layout and progress updates.

## 19) Rollout Plan
### Phase 1 (Week 1)
- Scaffold app and endpoint.
- Mock fallback + UI journey complete.

### Phase 2 (Week 2)
- Hardening for production:
  - Better retries/timeouts.
  - Analytics wiring.
  - Error telemetry.

### Phase 3 (Week 3)
- MVP beta with user feedback loop.
- Tune task prompt quality and reward balancing.

## 20) Risks and Mitigations
- Risk: AI output inconsistency.
  - Mitigation: strict output shape, server-side normalization, fallback tasks.

- Risk: Slow generation causing drop-off.
  - Mitigation: loading state, staged results, timeout handling.

- Risk: Motivational copy perceived as generic.
  - Mitigation: contextual encouragement tied to scene summary and progress.

## 21) Post-MVP Backlog
- User accounts and session history.
- Re-clean reminders and recurring maintenance plans.
- Multi-angle room cleanup plans.
- Voice-guided cleanup mode.
- Personalized reward systems and streaks.

## 22) Open Questions
- Should we prioritize deterministic image-edit workflow over generated “inspired tidy” image for fidelity?
- What is the right default number of tasks for highest completion (5 vs 7)?
- Should XP be purely effort-based or adapt to user completion history?
