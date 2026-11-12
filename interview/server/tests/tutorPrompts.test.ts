import { describe, expect, it } from 'vitest';
import { buildSystemPrompt } from '../src/services/tutor/tutorPrompts';

describe('Phase 6: Tutor Prompt Engineering & Mode Calibration Tests', () => {
  const mockBaseContext = {
    student: {
      name: 'Aditi Sharma',
      targetRole: 'Software Development Engineer',
      targetCompany: 'Google',
      preparationGoal: 'DSA Mastery',
    },
    topic: {
      id: 'topic_123',
      name: 'Dynamic Programming',
      masteryProbability: 0.2,
      masteryBand: 'Beginner' as const,
    },
  };

  it('1. Calibrates beginner tone with analogies and simple definitions', () => {
    const prompt = buildSystemPrompt({
      mode: 'explain',
      context: mockBaseContext,
    });

    expect(prompt).toContain('Aditi Sharma');
    expect(prompt).toContain('Software Development Engineer');
    expect(prompt).toContain('Dynamic Programming (Estimated Mastery: 20%, Level: Beginner)');
    expect(prompt).toContain('Use intuitive, everyday real-world analogies');
    expect(prompt).toContain('Define technical terms before using them');
  });

  it('2. Calibrates developing tone focusing on algorithmic logic and trees', () => {
    const developingContext = {
      ...mockBaseContext,
      topic: {
        id: 'topic_123',
        name: 'Dynamic Programming',
        masteryProbability: 0.55,
        masteryBand: 'Developing' as const,
      },
    };

    const prompt = buildSystemPrompt({
      mode: 'explain',
      context: developingContext,
    });

    expect(prompt).toContain('mastery probability: 55%');
    expect(prompt).toContain('Focus on the underlying algorithmic logic, recursion trees');
  });

  it('3. Calibrates proficient/strong tone emphasizing complexity and edge cases', () => {
    const proficientContext = {
      ...mockBaseContext,
      topic: {
        id: 'topic_123',
        name: 'Dynamic Programming',
        masteryProbability: 0.88,
        masteryBand: 'Strong' as const,
      },
    };

    const prompt = buildSystemPrompt({
      mode: 'explain',
      context: proficientContext,
    });

    expect(prompt).toContain('mastery probability: 88%');
    expect(prompt).toContain('Speak like a senior engineer conducting a technical interview');
    expect(prompt).toContain('Emphasize time and space complexity trade-offs');
  });

  it('4. Enforces strict hint levels without leaking full solutions on levels 1-3', () => {
    const hint1 = buildSystemPrompt({
      mode: 'hint',
      context: mockBaseContext,
      hintLevel: 1,
    });
    expect(hint1).toContain('Current Level: 1 of 4');
    expect(hint1).toContain('Level 1: Gentle conceptual nudge');
    expect(hint1).toContain('CRITICAL: Do NOT give the full complete solution on Levels 1-3');

    const hint3 = buildSystemPrompt({
      mode: 'hint',
      context: mockBaseContext,
      hintLevel: 3,
    });
    expect(hint3).toContain('Current Level: 3 of 4');
    expect(hint3).toContain('Level 3: Pseudocode & step-by-step logic');
  });

  it('5. Enforces Socratic mentoring in guided mode', () => {
    const prompt = buildSystemPrompt({
      mode: 'guided',
      context: mockBaseContext,
    });

    expect(prompt).toContain('MODE: GUIDED / SOCRATIC PROBLEM SOLVING');
    expect(prompt).toContain('Ask targeted questions to help the student find the solution themselves');
  });

  it('6. Directs code snippets and complexity breakdown in solution mode', () => {
    const prompt = buildSystemPrompt({
      mode: 'solution',
      context: mockBaseContext,
    });

    expect(prompt).toContain('MODE: FULL SOLUTION WALKTHROUGH');
    expect(prompt).toContain('Detail the Time Complexity and Space Complexity');
  });

  it('7. Sets up mini-quiz instructions without official question bank side-effects', () => {
    const prompt = buildSystemPrompt({
      mode: 'quiz',
      context: mockBaseContext,
    });

    expect(prompt).toContain('MODE: FORMATIVE MINI-QUIZ');
    expect(prompt).toContain('does NOT affect their official question bank rating');
  });
});

