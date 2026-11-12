# PrepMind AI — Bayesian Knowledge Tracing (BKT) Initialization Policy & Architecture Design

## 1. Executive Summary & Objective

In **PrepMind AI**, placement preparation combines rigorous diagnostic assessments with adaptive learning. 

During Phase 3, the platform established:
- **`InitialSkillProfile`**: Tracks empirical, observed test outcomes (attempted questions, correct answers, observed accuracy percentage, and rule-based baseline performance tiers: *Strong*, *Developing*, *Needs Improvement*, *Insufficient Data*).

As the platform transitions to **Phase 4 (Adaptive Learning Engine)**, we introduce Bayesian Knowledge Tracing (BKT) to model latent student knowledge states probabilistically.

> [!IMPORTANT]
> **Key Architectural Principle**: Observed assessment accuracy must **never** be equated directly with the probability of mastery ($P(L)$). Accuracy is a visible empirical metric subject to guessing, careless slips, and varying question difficulty, whereas mastery is an unobserved latent cognitive variable.

---

## 2. Separation of Concerns: Observed Performance vs. Latent Knowledge State

| Dimension | `InitialSkillProfile` (Phase 3 Observed) | `KnowledgeState` (Phase 4 Latent BKT) |
| :--- | :--- | :--- |
| **Concept Modeled** | Observed empirical test performance. | Probabilistic latent mastery of topic. |
| **Primary Metric** | `accuracy` ($0 \dots 100\%$) & `baselineLevel`. | `masteryProbability` ($0.0 \dots 1.0$). |
| **Statistical Meaning**| $\frac{\text{Correct}}{\text{Total Questions}} \times 100$ | $P(L_t)$ updated via Bayes' rule. |
| **Influencing Factors**| Raw score, attempt count, time. | Slips $P(S)$, guesses $P(G)$, transit $P(T)$. |
| **Student Transparency**| User-facing scorecard and skill badges. | Internal model used for adaptive question selection. |
| **Double-Counting Risk**| Aggregates historical counts linearly. | Strictly guarded via `processedEventIds`. |

---

## 3. Mathematical Fallacy of Direct Accuracy-to-Mastery Mapping

Treating observed accuracy directly as $P(\text{Mastery})$ violates core psychometric principles:

1. **The Guessing Factor $P(G)$**: A student answering a 4-option single-choice MCQ correctly has a $25\%$ baseline probability of guessing without knowing the concept. Directly treating a $100\%$ score on 1 question as $P(\text{Mastery}) = 1.0$ produces severe overconfidence.
2. **The Slip Factor $P(S)$**: Even an advanced student who has mastered a topic can make a careless typo or misread a problem statement ($P(S) \approx 0.10$). Scoring 0/1 does not imply $P(\text{Mastery}) = 0.0$.
3. **Sample Size Sensitivity**: An accuracy of $100\%$ on 1 question carries significantly less statistical evidence than an accuracy of $100\%$ across 15 diverse questions. BKT naturally accounts for evidence accumulation through repeated Bayesian updates.

---

## 4. Standard BKT Model & Mathematical Update Equations

Standard BKT defines four core parameters for each topic:

| Parameter | Notation | Description | Initial Default Baseline |
| :--- | :--- | :--- | :--- |
| **Prior** | $P(L_0)$ | Initial probability that student has mastered the topic prior to observations. | $0.20$ |
| **Slip** | $P(S)$ | Probability student answers incorrectly despite possessing mastery. | $0.10$ |
| **Guess** | $P(G)$ | Probability student answers correctly without possessing mastery. | $0.20$ |
| **Learning** | $P(T)$ | Probability of transitioning from unmastered to mastered state upon practicing. | $0.15$ |

### 4.1. Observation Posterior Update
When an answer is observed at step $t$:

#### A. If Response is Correct:
$$P(L_t \mid \text{Correct}) = \frac{P(L_t) \times (1 - P(S))}{P(L_t) \times (1 - P(S)) + (1 - P(L_t)) \times P(G)}$$

#### B. If Response is Incorrect:
$$P(L_t \mid \text{Incorrect}) = \frac{P(L_t) \times P(S)}{P(L_t) \times P(S) + (1 - P(L_t)) \times (1 - P(G))}$$

### 4.2. Learning State Transition
Immediately after incorporating the observation posterior, the student has had an opportunity to learn from the question or explanation:
$$P(L_{t+1}) = P(L_t \mid \text{Observation}) + \left(1 - P(L_t \mid \text{Observation})\right) \times P(T)$$

> [!NOTE]
> There is a critical distinction between **$P(L_t \mid \text{Observation})$** (the posterior belief about the student's mastery *at the time of answering*) and **$P(L_{t+1})$** (the predictive mastery belief *prior to the next opportunity*, which incorporates the learning rate $P(T)$).

---

## 5. Phase 4 Initialization Policy from Diagnostic Evidence

When a student completes the **Full Placement Diagnostic Assessment**:

1. **Population Baseline Prior**: Every topic begins at population prior $P(L_0) = 0.20$.
2. **Sequential Diagnostic Replay**: The individual responses submitted in the diagnostic session are processed sequentially in chronological order:
   - For each response $i \in \{1 \dots k\}$ for that topic:
     $$P(L_i \mid \text{Obs}_i) \rightarrow P(L_{i+1})$$
3. **Initialized Posterior Baseline**: The final $P(L_{k+1})$ becomes the student's individualized starting `masteryProbability` in `KnowledgeState`.

### 5.1. Preventing Double-Counting of Diagnostic Evidence
To guarantee diagnostic questions are never processed twice:
- `KnowledgeState` maintains an array `processedEventIds: string[]`.
- Each diagnostic response snapshot ID (`questionId` + `sessionId`) is permanently logged into `processedEventIds`.
- The adaptive practice runner checks `if (knowledgeState.processedEventIds.includes(eventId)) return;` before applying any Bayesian update.

---

## 6. Schema Structure: `server/src/models/KnowledgeState.ts`

```typescript
{
  userId: ObjectId,                // Ref: User
  topicId: ObjectId,               // Ref: Topic

  masteryProbability: Number,      // Current P(L_t) in [0.0, 1.0]
  priorProbability: Number,        // Initial P(L_0)

  slipProbability: Number,         // P(S) in [0.0, 1.0]
  guessProbability: Number,        // P(G) in [0.0, 1.0]
  learningProbability: Number,     // P(T) in [0.0, 1.0]

  observationsProcessed: Number,   // Monotonic counter of applied events
  processedEventIds: [String],     // Deduplication ledger
  sourceAssessmentId: ObjectId,    // Ref: AssessmentResult

  lastUpdatedAt: Date
}
```

---

## 7. Model Calibration & Limitations

1. **Cold Start vs. Calibration**: Default parameters ($0.20, 0.10, 0.20, 0.15$) serve as safe initial starting values. As production submission volume scales, parameters should be calibrated per topic using Expectation-Maximization (Baum-Welch) or grid search over historical student trajectories.
2. **Binary State Assumption**: Standard BKT assumes knowledge is binary (mastered or unmastered). Partial understanding is captured via continuous probability $P(L_t) \in [0, 1]$.
3. **Independence Assumption**: Knowledge states are tracked independently per topic. Higher-order dependencies (e.g. *Dynamic Programming* depending on *Recursion*) are managed via curriculum prerequisites in the taxonomy model.

