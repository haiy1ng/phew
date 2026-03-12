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
| **Implementation intentions** (if-then planning) have a medium-to-large effect on goal attainment (d = 0.65) across 94 tests (Gollwitzer & Sheeran, 2006). | Every task should include an if-then action cue (for example: "When I start, I will clear visible trash from the desk."). |
| Prompting users to **monitor progress** improves attainment (d+ = 0.40); effects are larger when progress is physically recorded (Harkin et al., 2016). | Checklist interaction must be central, not secondary. Each completed step is recorded and visibly updates progress. |
| Goal-setting research supports clear goals and mechanism-level moderators (Locke & Latham, 2002). | Tasks must be specific and operational, not vague (object + location + duration). |
| Too many options can reduce action (Iyengar & Lepper, 2000; 6 choices outperformed 24/30 in classic studies). | Limit concurrent options: show one recommended next task first and keep the rest collapsed until needed. |
| Reinforcement contingencies improve performance and motivation in ADHD samples; immediate rewards matter (Luman et al., 2005; Luman et al., 2010). | Keep reward latency very low (instant haptic + visual acknowledgment on check-off). |
| Endowed progress increases persistence and completion speed (Nunes & Drèze, 2006). | Start sessions with legitimate initial progress (for example, "Plan created" counted as completed setup milestone). |
| Habit formation is variable (18-254 days to asymptote), and missing once does not materially break formation (Lally et al., 2010). | Use forgiving recovery UX; avoid punitive streak resets for missed sessions. |

## 3) Research-Driven Design Constraints

The qualitative research sharpens the product constraints:
- Start friction matters more than plan completeness.
- The first visible win matters more than fine-grained optimization across all later tasks.
- Users want less thinking, not more intervention.
- The frontend should feel calm:
  - no visible countdown timer,
  - no rescue-task interruptions,
  - no urgency mechanics.
- Maintenance matters, but it should be a light handoff rather than a heavy second system.
- Tool and organizer recommendations should come later, after clutter volume is reduced.

## 4) MVP Engine

The MVP engine should answer one question well: "What is the best first thing to do next?"

### 4.1 MVP behavior
- Generate `5-7` tasks by default; allow up to `10` only for very dense scenes.
- Surface one recommended next task by default; keep the rest collapsed until needed.
- Keep tasks concrete, short, and low-drama:
  - target `60-180` seconds internally,
  - no visible timer on the frontend,
  - no rescue-task surfaces.
- End the plan with a light maintenance handoff when appropriate.

### 4.2 Minimal concepts

The engine should use only three core concepts:
- `phase`: where the task belongs in the cleanup order.
- `impact`: how much immediate visible/useful improvement the task creates.
- `effort`: how hard the task will feel to start and finish.

Anything else should either map into one of those or be removed.

### 4.3 What comes from the initial LLM call

The initial multimodal call should return structured task drafts, not final ranking.

```ts
export type TaskDraft = {
  id: string;
  title: string;
  instruction: string;
  taskKind: "trash" | "gather" | "group" | "reset" | "clean" | "finish";
  zoneId: string;
  estimatedSeconds: number;
  impactHint: 1 | 2 | 3 | 4 | 5;
  decisionHeavy: boolean;
};
```

LLM-generated fields:
- `title`: user-facing task title.
- `instruction`: one concrete action.
- `taskKind`: rough task type.
- `zoneId`: where the task happens.
- `estimatedSeconds`: rough duration estimate.
- `impactHint`: how noticeable the result will be right away.
- `decisionHeavy`: whether the task involves lots of keep/discard/sort choices.

### 4.4 What the backend derives

The backend should normalize and derive the actual ranking fields.

```ts
export type TaskCandidate = TaskDraft & {
  phase: 1 | 2 | 3 | 4 | 5 | 6;
  impactScore: number; // 0..1, derived from impactHint
  effortScore: number; // 0..1, derived from duration + decisionHeavy
  starterFitScore: number; // internal only
  orderScore: number; // internal only
};
```

Backend-derived fields:
- `phase`: mapped from `taskKind`.
- `impactScore`: normalized from `impactHint`.
- `effortScore`: combined "how hard this feels" score.
- `starterFitScore`: used only to pick the first recommended task.
- `orderScore`: used only to sort tasks within a valid phase.

### 4.5 Scoring model

The old scoring model had too many overlapping concepts. The MVP should use only this:

```txt
impactScore = (impactHint - 1) / 4

effortScore = clamp(
  ((estimatedSeconds - 30) / 150) + (decisionHeavy ? 0.25 : 0),
  0,
  1
)

starterFitScore = impactScore - (0.7 * effortScore)

orderScore = impactScore - (0.5 * effortScore)
```

How the scores are used:
- `starterFitScore`
  - used once, to choose the first recommended task from the earliest valid phase.
- `orderScore`
  - used after phase gating, to sort tasks within the same phase.

What the scores are not:
- not shown to the user,
- not persisted as product-facing data,
- not used to override hard sequencing rules.

### 4.6 Ordering rules

Ordering should be mostly rule-based, with scoring only used inside those rules.

Hard cleanup order:
1. `trash`
2. `gather`
3. `group`
4. `reset`
5. `clean`
6. `finish`

Rules:
- A later phase never jumps ahead of an earlier phase.
- The first recommended task should come from the earliest phase that has a strong starter fit.
- If no task in phase 1 has a good starter fit, choose the least-effort task from that phase rather than jumping forward.

### 4.7 Frontend contract

The frontend should stay calm and simple:
- show one recommended next task by default,
- allow the full list to expand if the user wants it,
- show checklist progress,
- no visible timer,
- no rescue-task interruptions,
- no urgency copy.

### 4.8 Acceptance criteria
- 90%+ sessions include a first recommended task `<= 90` seconds.
- 100% sessions enforce cleanup phase order.
- 95%+ task toggles trigger haptic response within latency target.
- 80%+ sessions surface a single recommended next task by default.
- Session resume restores checklist state and recommended-next-task state.

## 5) Future-State Engine

The future state should stay conceptually simple while becoming more adaptive.

### 5.1 Future-state capabilities
- Personalized effort weighting based on user completion history.
- Mode selection:
  - `quick win`
  - `full reset`
  - `maintenance`
- Optional audio launch into a preferred music or podcast app.
- Lightweight maintenance plans after a cleanup session.
- Body-doubling and social accountability features, if later validated.
- Delayed organizer/tool recommendations only after declutter threshold is reached.

### 5.2 Future-state engine upgrades
- Learn better effort weighting from real completion data.
- Adjust impact estimates based on room type and past user behavior.
- Offer different plan density for users who prefer:
  - very small wins,
  - fewer bigger tasks,
  - maintenance-first flows.

## 6) Instrumentation and Experiment Plan

Core metrics:
- `time_to_first_checkoff_seconds`
- `recommended_task_completion_rate`
- `task_completion_rate`
- `session_completion_rate`
- `return_and_resume_rate`
- `maintenance_task_accept_rate`

Initial experiments:
1. `5` tasks vs `7` tasks vs `10` tasks.
2. One recommended task vs expanded full checklist default.
3. Fixed effort weighting vs personalized effort weighting after enough history exists.
4. No-audio option vs optional audio launch.

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
