# PrepMind AI — Bayesian Knowledge Tracing (BKT) & Adaptive Selection

## 1. Mathematical Formulation
For each student $u$ and topic $k$, PrepMind AI maintains a latent mastery probability $P(L_n) \in (0, 1)$ parameterized by:
- $P(L_0)$: Initial mastery prior (`default: 0.25`, or calibrated from Diagnostic Assessment accuracy)
- $P(T)$: Learning transition probability (`default: 0.15`)
- $P(S)$: Slip probability (`default: 0.10`, constrained to $0 \le P(S) < 0.5$)
- $P(G)$: Guess probability (`default: 0.20`, constrained to $0 \le P(G) < 0.5$ and $1 - P(S) > P(G)$)

### Step 1: Posterior Update Given Observation $O_n \in \{1, 0\}$
If the student answers **correctly** ($O_n = 1$):
$$P(L_n \mid O_n = 1) = \frac{P(L_{n-1})(1 - P(S))}{P(L_{n-1})(1 - P(S)) + (1 - P(L_{n-1}))P(G)}$$

If the student answers **incorrectly** ($O_n = 0$):
$$P(L_n \mid O_n = 0) = \frac{P(L_{n-1})P(S)}{P(L_{n-1})P(S) + (1 - P(L_{n-1}))(1 - P(G))}$$

### Step 2: Learning Transition
$$P(L_n) = P(L_n \mid O_n) + (1 - P(L_n \mid O_n))P(T)$$

## 2. Mastery Classification & Difficulty Mapping
| Mastery Probability $P(L_n)$ | Classification Band | Target Question Difficulty |
|---|---|---|
| $P(L_n) < 0.40$ | `Beginner` | `Easy` |
| $0.40 \le P(L_n) < 0.70$ | `Developing` | `Medium` |
| $0.70 \le P(L_n) < 0.85$ | `Proficient` | `Hard` |
| $P(L_n) \ge 0.85$ | `Strong` | `Hard` (Spaced Maintenance) |

## 3. Strict BKT Integrity Invariant
Only **objective graded events** create `MasteryObservation` records and update `KnowledgeState`:
1. Graded practice attempts (`POST /api/practice/attempts`)
2. Submitted diagnostic/timed assessment questions (`POST /api/assessment-sessions/:id/submit`)
3. Adaptive practice answers (`POST /api/adaptive/sessions/:id/answer`)
4. First Accepted coding submission on a topic-tagged problem (`POST /api/coding/problems/:id/submit`)

Subjective or ungraded activities (checking off a roadmap task, chatting with the AI Tutor, or completing an AI Mock Interview) **never** alter `KnowledgeState`.

