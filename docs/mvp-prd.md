# Phew MVP PRD (iOS Native)

- Product: **Phew**
- Platform: **iOS native (SwiftUI)**
- Version: **MVP v0.2**
- Date: **March 12, 2026**
- Status: **Draft for implementation**

## 1) Product Summary
Phew helps users clean cluttered spaces without overwhelm. The user captures or uploads a photo of a messy area, sees an AI-generated "clean and organized" preview of that same space, and gets a short sequence of tiny tasks to check off. The experience is designed to reduce paralysis and increase momentum through visual motivation plus micro-wins.

## 2) Target Audience
### Individuals with ADHD / Executive Dysfunction
- Users who struggle to chunk large tasks into actionable steps.
- Need: very small, explicit actions and immediate progress cues.

### Busy Professionals
- Users with limited time who need a quick, meaningful win.
- Need: short task bursts that can fit into brief breaks.

### The Overwhelmed
- Anyone who feels paralyzed by domestic clutter.
- Need: calm guidance, clear starting point, and low-friction completion.

## 3) Problem Statement
People avoid cleaning because clutter feels emotionally and cognitively heavy. They often do not know where to begin, and broad to-do lists make the task feel even bigger. Most productivity apps do not convert a specific messy scene into ordered, realistic, low-effort actions.

## 4) Jobs To Be Done
- When I feel stuck looking at a messy area, help me start instantly with tiny actions.
- Show me what "better" looks like so I stay motivated.
- Let me pause and return without losing momentum.

## 5) MVP Features & Requirements
| Feature | Description | Priority |
|---|---|---|
| Vision Capture | User takes/uploads a photo of a messy area (desk, sink, corner). | P0 |
| AI "After" Preview | Generates a realistic image of the same space, but clean and organized. | P0 |
| Micro-Task Engine | AI analyzes the "Before" photo and generates 5-10 tiny, ~2-minute tasks. | P0 |
| Interactive Checklist | Simple checklist UI to mark tasks done, with haptic feedback for "dopamine hits." | P0 |
| Progress Persistence | Saves session so users can step away and return without losing progress. | P1 |

## 6) MVP Goals
1. Convert one messy-space image into an actionable cleanup session in under 30 seconds perceived setup time.
2. Drive early momentum with 5-10 tiny tasks and fast check-off interactions.
3. Improve completion confidence through side-by-side before/after motivation.

## 7) Non-Goals (MVP)
- Social features or accountability groups.
- Multi-room project planning across an entire home.
- Subscription/paywall optimization.
- Advanced personalization models.
- Android release.

## 8) User Flow (Primary)
1. User opens app.
2. User takes photo or selects image from Photos.
3. User taps "Generate Plan."
4. App returns:
   - AI "after" preview of same scene.
   - 5-10 ordered micro-tasks.
5. User starts cleaning and checks tasks one by one.
6. Haptic feedback, progress bar, and completion count update instantly.
7. User leaves app and returns later; session state is restored.
8. User finishes and gets completion state.

## 9) Functional Requirements (Product)
### FR-1 Vision Capture (P0)
- Support camera capture and photo library import.
- Accept `jpg`, `jpeg`, `png`, `heic`.
- Show clear error for unsupported/failed media.

Acceptance criteria:
- User can provide image in <= 2 taps from home screen.

### FR-2 AI "After" Preview (P0)
- Generate a realistic, cleaner version of the same room area.
- Preserve core structure/layout and camera viewpoint as much as possible.

Acceptance criteria:
- Preview feels plausibly "same space, cleaned" in most cases.

### FR-3 Micro-Task Engine (P0)
- Generate 5-10 tiny tasks.
- Default task size should be short (target around 2 minutes each).
- Steps must be practical and non-overlapping.

Acceptance criteria:
- Task list is understandable at a glance and immediately actionable.

### FR-4 Interactive Checklist + Haptics (P0)
- User can check/uncheck tasks.
- Trigger light haptic feedback on completion events.
- Show progress percentage and completed count.

Acceptance criteria:
- Toggle response is instant; no blocking network dependency.

### FR-5 Progress Persistence (P1)
- Persist current session (before image, after image URL/ref, task states, progress).
- Restore in-progress session when app relaunches.

Acceptance criteria:
- User can leave app for hours and return without losing checklist state.

## 10) Functional Requirements (Technical)
### AI Image Generation
- Input: user-generated photo.
- Prompting/model behavior: must use **in-painting** or **image-to-image** style generation to keep structural integrity of the room while removing clutter objects.
- Output: realistic cleaned preview that preserves room geometry/camera perspective where possible.

Technical acceptance criteria:
- Model call includes explicit preservation constraints (same room layout, same viewpoint, realistic cleaned state).
- Fallback behavior exists when generation fails (user still receives task plan).

### AI Task Logic
- Input: vision reasoning over image content to identify objects/surfaces (for example dishes, laundry, trash, paper piles).
- Output: logically sequenced steps.
- Sequencing rule: do not suggest deep cleaning tasks (for example vacuuming/wiping) before decluttering tasks (for example picking up clothes/trash).

Technical acceptance criteria:
- Server/app logic enforces ordering heuristics if model output is out of order.
- Each task contains concise title + one concrete action instruction.

Implementation detail reference:
- See the evidence-based engine design in [docs/micro-task-engine-framework.md](/Users/haiyingdong/Desktop/projects/phew/docs/micro-task-engine-framework.md).

## 11) iOS MVP Architecture
### Client
- SwiftUI app (`NavigationStack` + state-driven screens).
- `PhotosPicker` + camera capture flow.
- Checklist interaction with `UIImpactFeedbackGenerator` or equivalent SwiftUI haptics.
- Session state model in app layer.

### Persistence
- P1: local persistence via SwiftData (preferred) or Core Data.
- Persist:
  - Session id
  - Before image local reference
  - After image URL/local cache reference
  - Task list + completion state
  - Timestamp metadata

### Backend
- Lightweight API service:
  - Vision+reasoning endpoint for task generation.
  - Image transformation endpoint for after-preview.
- Return normalized JSON response for deterministic UI rendering.

## 12) Data Model (MVP)
Entity: `CleanupSession`
- `id`
- `createdAt`
- `updatedAt`
- `beforeImageRef`
- `afterImageRef`
- `status` (`in_progress`, `completed`)
- `progressPercent`

Entity: `CleanupTask`
- `id`
- `sessionId`
- `orderIndex`
- `title`
- `instruction`
- `estimatedSeconds`
- `isDone`

## 13) API Contract (Draft)
### Request
`POST /v1/cleanup/session`

```json
{
  "image": "<binary-or-base64>",
  "spaceType": "desk"
}
```

### Response
```json
{
  "sessionId": "sess_123",
  "sceneSummary": "Desk with mixed paper clutter and dishes.",
  "afterImageUrl": "https://...",
  "tasks": [
    {
      "id": "task_1",
      "orderIndex": 1,
      "title": "Remove obvious trash",
      "instruction": "Put all wrappers and disposable items into one trash bag.",
      "estimatedSeconds": 120
    }
  ]
}
```

## 14) UX Principles
- **Start instantly**: minimal input burden on first screen.
- **Reduce overwhelm**: short tasks and calm language.
- **Reward momentum**: immediate haptic + visual progress feedback.
- **Preserve continuity**: in-progress sessions resume seamlessly.

## 15) Success Metrics
### Activation
- % of first-time users who complete photo capture/upload and generate plan.
- Target: >= 70%.

### Engagement
- % sessions with at least one checked task.
- Target: >= 65%.

### Completion
- % sessions reaching >= 60% task completion.
- Target: >= 40%.

### Return-without-drop
- % resumed sessions where user completes at least one additional task after returning.
- Target: >= 50%.

## 16) Non-Functional Requirements
- Median generation time (plan + after image): <= 15s on typical 4G/Wi-Fi.
- Smooth checklist interaction at 60fps equivalent UI responsiveness.
- Offline-safe persistence for in-progress checklist state.
- Accessibility baseline:
  - Dynamic Type support.
  - VoiceOver labels for actionable controls.
  - Clear contrast for primary actions.

## 17) Privacy and Safety
- Minimize retention of user photos; default to transient processing unless user opts in later.
- Do not use shaming or moralizing language in prompts or UI.
- Clearly label generated preview as AI output.

## 18) QA Plan (MVP)
- Unit tests:
  - Task ordering enforcement.
  - Progress calculation.
  - Persistence encode/decode.
- Integration tests:
  - Successful generation path.
  - Image generation failure fallback.
  - Session restore path.
- Manual test matrix:
  - iPhone small/large form factors.
  - Interruptions (background/foreground).
  - Slow network and timeout handling.

## 19) Milestones
### Milestone 1 (Week 1)
- SwiftUI app shell + vision capture + static checklist prototype.

### Milestone 2 (Week 2)
- AI after-preview + micro-task engine integration.

### Milestone 3 (Week 3)
- Haptics tuning + persistence + beta hardening.

## 20) Risks and Mitigations
- Risk: AI output is unrealistic or generic.
  - Mitigation: stronger prompt constraints + fallback UX.

- Risk: Task order quality degrades user trust.
  - Mitigation: enforce declutter-before-deep-clean ordering rules.

- Risk: Users churn if generation feels slow.
  - Mitigation: progressive loading states and fast local checklist interactions.

## 21) Post-MVP Backlog
- Multi-session streaks and adaptive rewards.
- Shared household mode.
- Personalized task difficulty based on user completion behavior.
- Siri Shortcuts support for quick "start cleanup" flow.

## 22) Open Questions
- Should MVP keep session history list or only restore last active session?
- Which model/provider gives best structure-preserving image transformation quality for cost?
- Should default tasks always be fixed at 7, or dynamic based on clutter density?
