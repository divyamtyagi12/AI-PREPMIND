# PrepMind AI — Prerequisite-Aware Personalized Learning Roadmap Engine

## 1. Prerequisite Graph & Cycle Prevention
Topics are linked via `TopicPrerequisite` documents (`topicId`, `prerequisiteTopicId`, `dependencyType`: `'mandatory' | 'recommended'`).
- Before inserting a new edge $A \to B$, the backend executes a Depth-First Search (DFS) reachability check (`prerequisite.service.ts`) to reject self-dependencies and cycles with `400 Bad Request`.
- During roadmap generation, Kahn's topological sort orders topics so mandatory prerequisites are scheduled prior to dependent topics.

## 2. Multi-Factor Priority Scoring
Each candidate topic $t$ is scored using configurable weights from `RoadmapConfig`:
$$\text{Priority}(t) = w_1 \cdot (1 - P(L_t)) + w_2 \cdot \text{PlacementWeight}(t) + w_3 \cdot \text{PrereqOutDegree}(t) + w_4 \cdot \text{RevisionUrgency}(t) + w_5 \cdot \text{GoalMatch}(t)$$

## 3. Daily Workload Allocation & Spaced Revision
- Tasks (`concept_study`, `guided_practice`, `adaptive_practice`, `spaced_revision`, `assessment_checkpoint`) are packed into daily study windows respecting `weeklyAvailability` (`monday`–`sunday` minutes) and `maxDailyWorkload`.
- Completing a topic schedules spaced repetition intervals at `[1, 3, 7, 14, 30]` days in `RevisionSchedule`.
- **Dynamic Replanning**: Triggered manually (`POST /api/roadmaps/:id/replan`) or when missed tasks accumulate, redistributing pending tasks across remaining days while logging a `RoadmapAdjustmentLog` audit entry.

## 4. Multi-Pillar Placement Readiness & Assessment Completeness
The Placement Readiness Index ($R \in [0, 100]$) unifies 5 distinct preparation dimensions:
$$R = 0.35 \cdot \text{BKT} + 0.25 \cdot \text{Assessment} + 0.20 \cdot \text{Interview} + 0.10 \cdot \text{Coding} + 0.10 \cdot \text{Roadmap}$$

### Data Completeness & Insufficient Evidence Guardrails
To prevent misleading low scores when a student has only partially engaged with the platform:
- **Completeness Metric**: Measures the fraction of the 5 pillars with active evidence:
  $$\text{Completeness} = \frac{\text{Active Pillars}}{5} \times 100\%$$
- **Reliability Status**:
  - `Insufficient Evidence` ($< 40\%$, $< 2$ active pillars): Triggers an amber warning banner on the analytics dashboard explaining that missing pillars represent uncollected evidence rather than failing scores.
  - `Partial Evidence` ($40\% - 60\%$, $2-3$ active pillars): Indicates moderate assessment coverage.
  - `Robust Evidence` ($\ge 80\%$, $4-5$ active pillars): Reliable readiness index based on comprehensive multi-pillar activity.
- **Evidence Checklist**: The UI renders a real-time status matrix showing active vs. missing evidence for all 5 pillars with direct links to take assessments, practice coding, or start mock interviews.


