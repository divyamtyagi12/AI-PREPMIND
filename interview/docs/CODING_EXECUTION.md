# PrepMind AI — Online Coding Platform & Sandboxed Execution

## 1. Security Isolation Architecture
Student code is **never** executed inside the Node.js/Express application process (`child_process`, `eval`, or `vm` are strictly prohibited).
- All code execution requests pass through the `IExecutionProvider` interface (`executionProvider.interface.ts`) to `Judge0ExecutionProvider` (`judge0.provider.ts`), which communicates over HTTPS with an isolated Judge0 CE / RapidAPI sandboxed container cluster.
- Supported languages: **C++ (`cpp`, GCC 9.2.0)**, **Java (`java`, OpenJDK 13)**, **Python (`python`, 3.8)**, and **JavaScript (`javascript`, Node.js 12)**.

## 2. Sample vs. Hidden Test Case Evaluation
- **`POST /api/coding/problems/:id/run`**: Evaluates source code only against `visibility: 'sample'` test cases and returns `stdout`, `stderr`, `compileOutput`, and per-case comparison for rapid debugging.
- **`POST /api/coding/problems/:id/submit`**: Evaluates source code against both `sample` and `hidden` test cases, persists a `CodingSubmission` record with aggregate runtime (`executionTimeMs`) and memory (`memoryKb`), and updates `CodingProgress`.
- Hidden test case inputs and expected outputs are stripped from all API responses to prevent hardcoding solutions.
- **BKT Integration**: Only the **first** `accepted` submission for a topic-linked `CodingProblem` records a positive `MasteryObservation` (`observationId: coding_accepted:<userId>:<problemId>`), preventing repeated submissions of the same problem from inflating BKT mastery.

