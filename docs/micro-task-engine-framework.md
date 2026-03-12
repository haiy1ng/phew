# Phew Micro-Task Engine Framework (Evidence-Based)

## 1) Product Objective for the Engine
Design a micro-task system that reliably helps users:
- feel **motivated** (fast wins, visible progress, immediate reinforcement),
- feel **empowered** (clear next step, low ambiguity),
- avoid **overwhelm/procrastination** (small task size, low delay, limited choices).

## 2) Key Evidence Insights and Design Implications

| Evidence insight | What it means for Phew |
|---|---|
| Procrastination is strongly associated with **task aversiveness**, **delay**, **low self-efficacy**, and **impulsiveness** (Steel, 2007). | Task generator should minimize aversiveness and delay-to-reward, and maximize confidence with very small starter tasks. |
| **Implementation intentions** (if-then planning) have a medium-to-large effect on goal attainment (d = 0.65) across 94 tests (Gollwitzer & Sheeran, 2006). | Every task should include an if-then action cue (for example: "If timer starts, then collect visible trash for 2 minutes."). |
| Prompting users to **monitor progress** improves attainment (d+ = 0.40); effects are larger when progress is physically recorded (Harkin et al., 2016). | Checklist interaction must be central, not secondary. Each completed step is recorded and visibly updates progress. |
| Goal-setting research supports clear goals and mechanism-level moderators (Locke & Latham, 2002). | Tasks must be specific and operational, not vague (object + location + duration). |
| Too many options can reduce action (Iyengar & Lepper, 2000; 6 choices outperformed 24/30 in classic studies). | Limit concurrent options: show one recommended next task and at most two alternates. |
| Reinforcement contingencies improve performance and motivation in ADHD samples; immediate rewards matter (Luman et al., 2005; Luman et al., 2010). | Keep reward latency very low (instant haptic + visual acknowledgment on check-off). |
| Endowed progress increases persistence and completion speed (Nunes & Drèze, 2006). | Start sessions with legitimate initial progress (for example, "Plan created" counted as completed setup milestone). |
| Habit formation is variable (18-254 days to asymptote), and missing once does not materially break formation (Lally et al., 2010). | Use forgiving recovery UX; avoid punitive streak resets for missed sessions. |

## 3) The Framework: SPARK Loop

### S) Segment (chunk the mess into tiny actions)
- Build tasks in the 60-180 second range (target ~2 minutes).
- Each task should target one micro-outcome and no more than 1-2 object classes.
- Hard cap: 5-10 tasks total for MVP session.

### P) Prioritize (sequence for motivation, not just logic)
- Sequence must satisfy both:
  - **Dependency correctness** (declutter before deep cleaning).
  - **Early visible win** (first task should produce immediate visual improvement).
- First task constraint:
  - `estimated_seconds <= 90`
  - `visible_impact_score >= 0.7`

### A) Activate (turn intention into action)
- Convert each task into an if-then plan:
  - `If [cue], then I will [specific action] for [duration].`
- Default cue is immediate (`If I press Start`), optional contextual cue for maintenance mode (`After dinner`, `Before bed`).

### R) Reinforce + Record (instant reward + progress logging)
- Check-off triggers:
  - haptic feedback,
  - visual success state,
  - XP increment,
  - progress bar update.
- Record each completion event with timestamp and latency to support adaptation.

### K) Keep going (anti-stall adaptation)
- Detect stall when no completion/interaction for threshold window.
- Offer "rescue" micro-task (30-60 seconds) with lower effort and high visibility.
- Permit splitting task into two easier tasks with one tap.

## 4) Technical Specification

## 4.1 Data Contracts

```ts
export type SceneObject = {
  id: string;
  label: "trash" | "dish" | "laundry" | "paper" | "cable" | "misc";
  zoneId: string;
  confidence: number; // 0..1
  estimatedCount: number;
};

export type Zone = {
  id: string;
  label: string; // e.g., desk-surface, floor-left
  clutterScore: number; // 0..1
  accessibilityScore: number; // 0..1
};

export type TaskCandidate = {
  id: string;
  title: string;
  instruction: string;
  zoneId: string;
  objectTargets: string[];
  estimatedSeconds: number;
  dependencyIds: string[];
  visibleImpactScore: number; // 0..1
  aversivenessScore: number; // 0..1
  complexityScore: number; // 0..1
  ifThenPlan: string;
};

export type SessionState = {
  sessionId: string;
  tasks: Array<TaskCandidate & { isDone: boolean; startedAt?: string; doneAt?: string }>;
  activeTaskId?: string;
  completedCount: number;
  totalCount: number;
  overwhelmRisk: number; // 0..1
  procrastinationRisk: number; // 0..1
};
```

## 4.2 Pipeline

1. **Scene analysis**
- Vision model returns zones + object classes + confidence.
- Normalize to canonical object taxonomy for stable prompting.

2. **Candidate generation**
- Rule template examples:
  - `trash in visible zone -> remove trash task`
  - `dishes present -> dish collection task`
  - `papers/cables mixed -> category grouping task`
- Generate 12-20 candidates then prune to top 5-10 final tasks.

3. **Behavioral scoring (TMT-inspired)**
- Compute proxies:
  - `expectancy = 1 - complexityScore`
  - `value = 0.6 * visibleImpactScore + 0.4 * hygieneOrUtilityScore`
  - `delay = estimatedSeconds / 180`
  - `aversiveness = aversivenessScore`
- Motivation score:

```txt
motivation_score = (expectancy * value) / (1 + delay + aversiveness)
```

- Sort by highest `motivation_score` subject to dependencies.

4. **Dependency and order constraints**
- Phase order (hard rule):
  1) remove disposables/trash,
  2) gather misplaced items,
  3) reset surfaces,
  4) wipe/vacuum,
  5) place essentials.
- Do not schedule phase 4 before phase 1-3 completion threshold (>=70%).

5. **Activation formatting**
- Add if-then plan text per task.
- Keep instructions 8th-grade readability or lower.

6. **Runtime adaptation**
- If `time_since_last_completion > 180s` and current task not done:
  - surface rescue task (`estimatedSeconds <= 60`, `visibleImpactScore >= 0.6`).
- If user skips 2 tasks in a row:
  - reduce visible queue to single recommended task.

7. **Persistence and resume**
- Persist after every state change.
- Resume card at app open:
  - summary: `You completed X/Y` + one-tap continue on next easiest task.

## 4.3 Anti-Overwhelm UI Rules
- Show full plan only on demand; default "Now / Next / Later" (max 3 visible cards).
- One primary CTA per screen.
- No negative streak language; use recovery framing.

## 4.4 Reward and Feedback Rules
- Reward latency target: <100ms from checkbox tap to haptic trigger.
- XP reward = monotonic with effort, but keep increments modest to avoid inflation.
- Milestones at 25/50/75/100% with lightweight celebratory feedback.

## 4.5 Safety / Guardrails
- Never output unsafe instructions.
- Avoid shaming language.
- Avoid unrealistic deep-clean recommendations in first steps.
- Explicitly label preview image as AI-generated.

## 5) Acceptance Criteria (MVP)
- 90%+ generated sessions include a first task <=90 seconds.
- 100% sessions enforce declutter-before-deep-clean ordering.
- 95%+ check-off interactions produce haptic response within target latency.
- Session resume restores exact checklist state after app restart.

## 6) Instrumentation and Experiment Plan

Core metrics:
- `time_to_first_checkoff_seconds` (primary anti-procrastination KPI)
- `task_completion_rate`
- `session_completion_rate`
- `stall_events_per_session`
- `rescue_task_accept_rate`
- `return_and_resume_rate`

Initial experiments:
1. 5 tasks vs 7 tasks vs 10 tasks (completion and overwhelm tradeoff).
2. Single-next-task UI vs full checklist default.
3. Fixed 2-minute tasks vs adaptive duration from user history.
4. Haptic-only vs haptic+visual burst feedback.

## 7) Important Caveats
- Several findings above come from adjacent domains (education, health behavior, consumer behavior). The translation to home-cleaning UX is a reasoned product inference, not guaranteed 1:1 transfer.
- Engine should therefore be treated as evidence-informed and iteratively validated with product telemetry.

## 8) References (Primary Sources)
- Steel, P. (2007). *The nature of procrastination*. Psychological Bulletin. DOI: 10.1037/0033-2909.133.1.65. https://pubmed.ncbi.nlm.nih.gov/17201571/
- Gollwitzer, P. M., & Sheeran, P. (2006). *Implementation intentions and goal achievement: A meta-analysis*. DOI: 10.1016/S0065-2601(06)38002-1. https://www.sciencedirect.com/science/article/pii/S0065260106380021
- Harkin, B., et al. (2016). *Does monitoring goal progress promote goal attainment?* Psychological Bulletin. DOI: 10.1037/bul0000025. https://eprints.whiterose.ac.uk/91437/
- Locke, E. A., & Latham, G. P. (2002). *Goal setting and task motivation*. American Psychologist. DOI: 10.1037//0003-066x.57.9.705. https://pubmed.ncbi.nlm.nih.gov/12237980/
- Iyengar, S. S., & Lepper, M. R. (2000). *When choice is demotivating*. JPSP. DOI: 10.1037//0022-3514.79.6.995. https://pubmed.ncbi.nlm.nih.gov/11138768/
- Luman, M., Oosterlaan, J., & Sergeant, J. A. (2005). *Reinforcement contingencies in ADHD*. Clinical Psychology Review. DOI: 10.1016/j.cpr.2004.11.001. https://pubmed.ncbi.nlm.nih.gov/15642646/
- Luman, M., Tripp, G., & Scheres, A. (2010). *Altered reinforcement sensitivity in ADHD*. Neurosci Biobehav Rev. DOI: 10.1016/j.neubiorev.2009.11.021. https://pubmed.ncbi.nlm.nih.gov/19944715/
- Nunes, J. C., & Drèze, X. (2006). *The Endowed Progress Effect*. Journal of Consumer Research. DOI: 10.1086/500480. https://academic.oup.com/jcr/article-lookup/doi/10.1086/500480
- Lally, P., van Jaarsveld, C. H. M., Potts, H. W. W., & Wardle, J. (2010). *How are habits formed*. Eur J Soc Psychol. DOI: 10.1002/ejsp.674. https://openresearch.surrey.ac.uk/esploro/outputs/99783513802346
- Haynes, A. B., et al. (2009). *A surgical safety checklist to reduce morbidity and mortality*. NEJM. DOI: 10.1056/NEJMsa0810119. https://pubmed.ncbi.nlm.nih.gov/19144931/
- van Eerde, W., & Klingsieck, K. B. (2018). *Overcoming procrastination? A meta-analysis of intervention studies*. Educational Research Review. DOI: 10.1016/j.edurev.2018.09.002. https://www.sciencedirect.com/science/article/pii/S1747938X18300472
