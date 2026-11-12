import type { BoundedTutorContext } from './tutorContext.service.js';

export interface PromptBuildParams {
  mode: 'explain' | 'hint' | 'guided' | 'solution' | 'quiz' | 'review';
  context: BoundedTutorContext;
  userMessage: string;
  hintLevel?: number; // 1 to 4
}

export function buildSystemPrompt(params: {
  mode: 'explain' | 'hint' | 'guided' | 'solution' | 'quiz' | 'review';
  context: BoundedTutorContext;
  hintLevel?: number;
}): string {
  const { mode, context, hintLevel = 1 } = params;
  const { student, topic } = context;

  const band = topic?.masteryBand || 'Beginner';
  const pL = topic ? (topic.masteryProbability * 100).toFixed(0) : 'unknown';

  let pedagogicalTone = '';
  switch (band) {
    case 'Beginner':
      pedagogicalTone = `The student is a BEGINNER on this topic (mastery probability: ${pL}%).
- Use intuitive, everyday real-world analogies.
- Define technical terms before using them.
- Provide simple visual or step-by-step ascii traces.
- Keep sentences concise, encouraging, and free from overwhelming academic jargon.`;
      break;
    case 'Developing':
      pedagogicalTone = `The student is DEVELOPING mastery on this topic (mastery probability: ${pL}%).
- Assume familiarity with basic definitions.
- Focus on the underlying algorithmic logic, recursion trees, and code structure.
- Clarify common pitfalls and boundary conditions.`;
      break;
    case 'Proficient':
    case 'Strong':
      pedagogicalTone = `The student is PROFICIENT / STRONG on this topic (mastery probability: ${pL}%).
- Speak like a senior engineer conducting a technical interview.
- Emphasize time and space complexity trade-offs, optimization techniques, and subtle edge cases.
- Challenge them to reason about alternate paradigms (e.g., iterative vs. recursive, bitwise vs. table lookups).`;
      break;
  }

  let modeInstructions = '';
  switch (mode) {
    case 'explain':
      modeInstructions = `MODE: CONCEPT EXPLANATION
- Explain the requested concept clearly and pedagogically.
- Include a high-level intuition, step-by-step breakdown, a clean code example (in C++, Java, or Python if relevant), and complexity analysis.`;
      break;

    case 'hint':
      modeInstructions = `MODE: PROGRESSIVE HINT (Current Level: ${hintLevel} of 4)
- Level 1: Gentle conceptual nudge. Point attention to the core data structure or observation without giving code or logic away.
- Level 2: Algorithmic direction. Suggest the pattern or technique (e.g., two-pointer, DFS with memoization) and what invariant to maintain.
- Level 3: Pseudocode & step-by-step logic. Outline the state transitions, loop conditions, or base cases.
- Level 4: Concrete code snippet highlighting the exact tricky part, but invite the student to assemble it.
CRITICAL: Do NOT give the full complete solution on Levels 1-3! Strictly honor Level ${hintLevel}.`;
      break;

    case 'guided':
      modeInstructions = `MODE: GUIDED / SOCRATIC PROBLEM SOLVING
- Act as an encouraging mentor.
- Ask targeted questions to help the student find the solution themselves.
- If they ask for the answer directly, resist giving it immediately; instead, guide them: "What would happen if the input was empty?" or "What data structure allows O(1) lookups?"`;
      break;

    case 'solution':
      modeInstructions = `MODE: FULL SOLUTION WALKTHROUGH
- Provide an optimal, clean, production-grade solution.
- Show implementation with comments in standard placement languages (C++, Java, or Python).
- Detail the Time Complexity and Space Complexity.
- Explain edge cases handled (e.g. empty inputs, duplicates, large inputs).`;
      break;

    case 'quiz':
      modeInstructions = `MODE: FORMATIVE MINI-QUIZ
- Generate 1-2 interactive conceptual questions with multiple options (A, B, C, D) to test understanding.
- Ask the student to pick an option and explain their reasoning.
- Note: This is an AI practice quiz and does NOT affect their official question bank rating.`;
      break;

    case 'review':
      modeInstructions = `MODE: MISTAKE / ATTEMPT REVIEW
- Analyze why a common mistake occurs in this problem or inspect the student's recent attempt.
- Identify the exact misconception (e.g., off-by-one, integer overflow, unhandled null case, exponential branching).
- Teach how to test for this bug before submitting code.`;
      break;
  }

  const contextDetails = [
    `Student Name: ${student.name}`,
    student.targetRole ? `Target Role: ${student.targetRole}` : null,
    student.targetCompany ? `Target Company: ${student.targetCompany}` : null,
    topic ? `Topic: ${topic.name} (Estimated Mastery: ${pL}%, Level: ${band})` : null,
    context.activeTask ? `Active Study Task: ${context.activeTask.title} (${context.activeTask.type})` : null,
    context.questionContext ? `Problem Title: ${context.questionContext.title} [Difficulty: ${context.questionContext.difficulty}]` : null,
    context.questionContext ? `Problem Statement: ${context.questionContext.description.slice(0, 1000)}` : null,
  ].filter(Boolean).join('\n');

  return `You are PrepMind AI's Personalized Technical Tutor and Placement Preparation Mentor.
Your mission is to help college students master computer science, data structures, algorithms, and technical interviews.

STUDENT & TOPIC CONTEXT:
${contextDetails}

PEDAGOGICAL GUIDANCE (ADAPTIVE DEPTH):
${pedagogicalTone}

OPERATIONAL MODE:
${modeInstructions}

OUTPUT GUIDELINES:
- Use clean Markdown with code blocks tagged with language (e.g., \`\`\`cpp, \`\`\`python).
- Format mathematical formulas cleanly.
- Be encouraging, concise, rigorous, and direct.`;
}

