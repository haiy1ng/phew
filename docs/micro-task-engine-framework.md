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

## 3) Research-Driven Improvements

The qualitative research adds a few product constraints that are stronger than the literature-only version:
- Start friction matters more than total plan completeness.
- The first visible win is disproportionately important.
- Users want less thinking, not just less work.
- Audio can reduce aversiveness and help activation, but it is a support layer rather than the core intervention.
- Maintenance matters because users experience cleaning as a cycle, not a one-time project.
- Tool and organizer recommendations should be delayed until clutter volume is reduced, to avoid the "tool trap."

## 4) MVP Engine

The MVP engine should optimize for one outcome above all others: fast transition from paralysis to first checkoff.

### 4.1 MVP product behavior
- Generate `5-7` tasks by default; allow up to `10` only for very dense scenes.
- Select one task as the clear recommended starter.
- Keep the starter task short and visually rewarding:
  - `estimated_seconds <= 90`
  - `visible_impact_score >= 0.7`
  - `decision_load_score <= 0.4`
- Show only `Now / Next / Later` by default, with at most 3 visible cards.
- Attach an activation bundle to the starter task:
  - if-then action cue,
  - suggested timer length,
  - optional activation aid marker for future extensions.
- If the user stalls, offer either:
  - a rescue micro-task (`30-60` seconds), or
  - a split-task version of the current task.
- End the session with one lightweight maintenance action so the app bridges from cleanup to upkeep.

### 4.2 MVP data contracts

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
  visibleImpactPotential: number; // 0..1
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
  decisionLoadScore: number; // 0..1
  energyRequiredScore: number; // 0..1
  ifThenPlan: string;
  activationAid: "timer" | "none";
  starterTaskEligible: boolean;
  maintenanceEligible: boolean;
};

export type ActivationBundle = {
  starterTaskId: string;
  timerSeconds: number;
  startCue: string;
};

export type SessionState = {
  sessionId: string;
  tasks: Array<TaskCandidate & { isDone: boolean; startedAt?: string; doneAt?: string }>;
  activeTaskId?: string;
  completedCount: number;
  totalCount: number;
  overwhelmRisk: number; // 0..1
  procrastinationRisk: number; // 0..1
  stallCount: number;
  activationBundle: ActivationBundle;
};
```

### 4.3 MVP pipeline

1. **Scene analysis**
- Use a multimodal model to return zones, object classes, clutter density, and candidate tasks in one structured response.
- Normalize object labels into a small canonical taxonomy for stable downstream logic.

2. **Candidate generation**
- Create `12-20` candidates internally, then prune to the final `5-7` recommended tasks.
- Candidate templates should prioritize:
  - trash removal,
  - dish/laundry gathering,
  - pile grouping,
  - surface reset,
  - wipe/vacuum only after declutter.

3. **Behavioral scoring**
- Compute:
  - `expectancy = 1 - complexityScore`
  - `value = 0.5 * visibleImpactScore + 0.3 * hygieneOrUtilityScore + 0.2 * accessibilityScore`
  - `delay = estimatedSeconds / 180`
  - `friction = aversivenessScore + decisionLoadScore`
- Motivation score:

```txt
motivation_score = (expectancy * value) / (1 + delay + friction)
```

- Starter score:

```txt
starter_score = visibleImpactScore + accessibilityScore - decisionLoadScore - aversivenessScore
```

4. **Dependency and order constraints**
- Hard order:
  1) trash/disposables,
  2) gather obvious misplaced items,
  3) group remaining clutter,
  4) reset surfaces,
  5) wipe/vacuum,
  6) finishing placement,
  7) maintenance anchor.
- Do not surface wipe/vacuum tasks before major loose clutter is reduced.

5. **Queue shaping**
- Put only three tasks in the primary queue:
  - `Now`: recommended starter or active task
  - `Next`: likely follow-up
  - `Later`: one additional option
- Keep all other tasks collapsed.

6. **Activation formatting**
- Every visible task must have:
  - concise title,
  - one concrete instruction,
  - time estimate,
  - if-then cue.
- The starter card should default to timer-based activation in MVP:
  - example: `Start a 60-second timer and clear visible trash`.

7. **Runtime adaptation**
- If `time_since_last_completion > 180s`, generate a rescue task:
  - `estimatedSeconds <= 60`
  - high visibility
  - low decision load
- If the user skips or abandons two tasks, narrow the queue to a single recommended task.
- If the user completes the first two tasks quickly, unlock a denser plan or longer tasks.

8. **Persistence and resume**
- Persist after every task toggle and queue change.
- Resume should show:
  - completed count,
  - the next recommended task,
  - a one-tap restart cue.

### 4.4 MVP anti-overwhelm rules
- One primary CTA per screen.
- Do not default to showing the full checklist.
- Avoid ambiguous verbs like `organize` or `tidy up`; use object + action + location.
- Avoid recommending organizers before item volume is reduced.
- No punitive streak or guilt framing.

### 4.5 MVP reward and feedback rules
- Reward latency target: `<100ms` from tap to haptic.
- Milestones at `25/50/75/100%`.
- Progress should emphasize visible gains, not just counts.
- The starter task should create legitimate endowed progress as soon as the session begins.

### 4.6 MVP acceptance criteria
- 90%+ sessions include a starter task `<= 90` seconds.
- 100% sessions enforce declutter-before-deep-clean ordering.
- 95%+ task toggles trigger haptic response within latency target.
- 80%+ sessions show only `Now / Next / Later` by default.
- Session resume restores exact checklist and recommended-next-task state.

## 5) Future-State Engine

The future state should move from static session planning to adaptive cleaning support.

### 5.1 Future-state capabilities
- Personalized task duration based on past completion speed and abandonment patterns.
- Mode selection:
  - `quick win`
  - `full reset`
  - `maintenance`
- Adaptive audio support:
  - open user's preferred music or podcast app,
  - suggest different audio types based on task aversiveness and user history.
- Smart maintenance plans after a cleanup session:
  - 2-minute daily reset,
  - room-specific upkeep prompts,
  - relapse recovery flows.
- Body-doubling and social accountability features, if later validated.
- Delayed organizer/tool recommendations only after declutter threshold is reached.

### 5.2 Future-state engine upgrades
- Replace fixed scoring weights with learned personalization weights.
- Predict stall risk before it happens and pre-empt with lower-friction task suggestions.
- Dynamically re-chunk tasks when the engine detects hidden clutter layers or rising overwhelm.
- Use session history to choose whether the user benefits more from:
  - visible-win tasks,
  - time-boxed sprints,
  - maintenance-first resets,
  - audio-assisted activation.

## 6) Instrumentation and Experiment Plan

Core metrics:
- `time_to_first_checkoff_seconds` (primary anti-procrastination KPI)
- `starter_task_completion_rate`
- `task_completion_rate`
- `session_completion_rate`
- `stall_events_per_session`
- `rescue_task_accept_rate`
- `return_and_resume_rate`
- `maintenance_task_accept_rate`

Initial experiments:
1. `5` tasks vs `7` tasks vs `10` tasks.
2. `Now / Next / Later` vs full checklist default.
3. Fixed 2-minute tasks vs adaptive duration after first completion.
4. No-audio prompt vs `music` prompt vs `podcast` prompt.
5. Rescue task vs split-task fallback.

## 7) Important Caveats
- Several findings above come from adjacent domains (education, health behavior, consumer behavior). The translation to home-cleaning UX is a reasoned product inference, not guaranteed 1:1 transfer.
- The qualitative research pass is directionally useful but not a representative population sample.
- Engine decisions should therefore be treated as evidence-informed and validated with product telemetry.

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
