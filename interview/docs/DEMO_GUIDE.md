# PrepMind AI — Final-Year Project Demonstration Guide (Viva & Evaluation)

## 1. Quick CLI Demonstration
To demonstrate all 9 phases in terminal during project evaluation:
```bash
npm --prefix interview/server run demo
```

## 2. Live Browser Walkthrough Sequence (10 Minutes)
1. **Onboarding & Authentication (`/register` -> `/onboarding`)**:
   - Register a new student account, select degree (`B.Tech / B.E.`), target role (`Software Engineer`), preferred language (`C++`), and preparation goals (`DSA`, `Core CS`).
2. **Diagnostic Assessment & Skill Profile (`/assessments` -> `/skill-profile`)**:
   - Start the **Placement Diagnostic Assessment**, demonstrate real-time answer autosave and server timer, submit, and inspect topic-wise baseline classifications on `/skill-profile`.
3. **Bayesian Knowledge Tracing & Adaptive Practice (`/adaptive` -> `/mastery`)**:
   - Launch an Adaptive Practice session. Show how answering correctly increases the topic's Bayesian mastery probability $P(L_n)$ and dynamically adapts subsequent question difficulty (`Easy -> Medium -> Hard`).
4. **Prerequisite-Aware Learning Roadmap (`/roadmap`)**:
   - Generate a personalized study roadmap, view daily tasks (`/roadmap/daily`), spaced revisions, and trigger dynamic replanning.
5. **Context-Aware Gemini AI Tutor (`/ai-tutor`)**:
   - Ask for a **Level 1 Hint** on a DSA topic and show how the AI Tutor provides a conceptual nudge without spoiling the final solution while tracking daily quota.
6. **Online Coding Platform (`/coding`)**:
   - Open a coding problem in the Monaco Editor, run against sample test cases, submit against hidden test cases, and inspect runtime/memory verdicts and `/coding/analytics`.
7. **AI Mock Interview (`/interviews/setup` -> `/interviews`)**:
   - Start a Technical or DSA mock interview, submit an answer, demonstrate an **Adaptive Follow-Up Question**, complete the session, and review the multi-criteria rubric report (`/interviews/:id/results`).
8. **Unified Placement Readiness Analytics (`/analytics`)**:
   - Show the **Placement Readiness Index** combining BKT Mastery, Assessments, Mock Interviews, Coding, and Roadmap progress, highlighting why subjective AI interview scores are kept strictly separate from objective BKT mastery.
9. **Administrator Governance (`/admin`)**:
   - Switch to an admin account and show Question Bank Review (`/admin/review`), Assessment Blueprints (`/admin/assessments`), Coding Problem Authoring (`/admin/coding`), Roadmap DAG Config (`/admin/roadmap-config`), and AI Tutor Quotas (`/admin/tutor-config`).

