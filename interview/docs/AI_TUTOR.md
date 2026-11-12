# PrepMind AI — Context-Aware Gemini AI Tutor

## 1. Pedagogical Modes
The AI Tutor (`tutor.service.ts`, `tutorPrompts.ts`) supports 6 structured teaching modes:
1. **`explain`**: First-principles conceptual explanation calibrated to the student's BKT mastery band (`Beginner` / `Developing` / `Proficient` / `Strong`).
2. **`hint`**: 3-level progressive hints (`Level 1`: Conceptual nudge, `Level 2`: Structural/algorithmic approach, `Level 3`: Pseudocode skeleton) that strictly withhold the final answer.
3. **`guided`**: Interactive Socratic step-by-step problem breakdown.
4. **`solution`**: Complete optimal solution with time and space complexity analysis.
5. **`quiz`**: Generates a quick conceptual check question without altering BKT mastery.
6. **`review`**: Analyzes a student's past practice attempt or assessment mistake.

## 2. Bounded Context Assembly & Guardrails
- `tutorContext.service.ts` retrieves bounded student context (active topic mastery $P(L_n)$, target role, preferred language, and referenced question/task) within a strict token budget.
- **Anti-Cheating Guardrail**: The AI Tutor never accesses or reveals answers for active `in_progress` timed `AssessmentSession` instances.
- **Quota & Telemetry**: `TutorUsage` tracks daily request counts and token consumption per student against `TutorAdminConfig.dailyRequestLimit`.

