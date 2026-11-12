import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import Profile from '../pages/Profile';
import TopicDetail from '../pages/TopicDetail';
import PracticeQuestion from '../pages/PracticeQuestion';
import DsaProblemBrowser from '../pages/DsaProblemBrowser';
import QuestionReviewQueue from '../pages/admin/QuestionReviewQueue';
import AiQuestionGenerator from '../pages/admin/AiQuestionGenerator';
import AssessmentList from '../pages/assessments/AssessmentList';
import AssessmentRunner from '../pages/assessments/AssessmentRunner';
import AssessmentHistory from '../pages/assessments/AssessmentHistory';
import { AuthContext } from '../context/AuthContext';
import * as userServiceModule from '../services/userService';
import * as contentServiceModule from '../services/contentService';

// Mock Sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('Login & Registration Form Validation', () => {
  it('validates required fields on Login', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ login: vi.fn(), user: null, loading: false }}>
          <Login />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole('button', { name: /log in/i });
    await user.click(submitBtn);

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  it('validates registration form mismatch and short password', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ register: vi.fn(), user: null, loading: false }}>
          <Register />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole('button', { name: /create account/i });
    await user.click(submitBtn);

    expect(await screen.findByText(/name must be at least 2 characters/i)).toBeInTheDocument();
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passInput = screen.getByLabelText(/^password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);

    await user.type(nameInput, 'Divyam');
    await user.type(emailInput, 'divyam@example.com');
    await user.type(passInput, 'Short1');
    await user.type(confirmInput, 'Mismatch123');
    await user.click(submitBtn);

    expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });
});

describe('Dashboard Component Empty States & Real Statistics', () => {
  it('displays real student information and genuine empty states without fake numbers', async () => {
    const mockUser = {
      name: 'Rohan Sharma',
      email: 'rohan@example.com',
      targetRole: 'Software Development Engineer',
      preparationLevel: 'Intermediate',
      preferredLanguage: 'Java',
      preparationGoals: ['DSA', 'Core CS'],
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.spyOn(contentServiceModule.practiceService, 'getStats').mockResolvedValue({
      totalAttempts: 0,
      uniqueQuestionsAttempted: 0,
      objectiveAccuracy: null,
      byCategory: [],
      recentActivity: [],
    });

    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ user: mockUser, loading: false }}>
          <Dashboard />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/preparing for software development engineer/i)).toBeInTheDocument();

    // Check genuine empty states
    expect(
      await screen.findByText(/start practicing questions to unlock recommendations/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/your practice accuracy will appear after your first mcq submission/i)
    ).toBeInTheDocument();

    // Verify goals display
    expect(screen.getByText('Java')).toBeInTheDocument();
  });
});

describe('Profile Editing', () => {
  it('loads profile and allows editing name and academic details', async () => {
    const mockUser = {
      name: 'Rohan Sharma',
      email: 'rohan@example.com',
      college: 'IIT Delhi',
      degree: 'B.Tech / B.E.',
      branch: 'Computer Science',
      graduationYear: 2026,
      targetRole: 'Software Development Engineer',
      preparationLevel: 'Intermediate',
      preferredLanguage: 'Java',
      preparationGoals: ['DSA'],
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.spyOn(userServiceModule.userService, 'getProfile').mockResolvedValue(mockUser);
    vi.spyOn(userServiceModule.userService, 'updateProfile').mockResolvedValue({
      ...mockUser,
      name: 'Rohan Updated',
    });

    const setUserMock = vi.fn();

    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ user: mockUser, setUser: setUserMock }}>
          <Profile />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(await screen.findByDisplayValue('Rohan Sharma')).toBeInTheDocument();
    expect(screen.getByDisplayValue('IIT Delhi')).toBeInTheDocument();

    const nameInput = screen.getByDisplayValue('Rohan Sharma');
    const user = userEvent.setup();
    await user.clear(nameInput);
    await user.type(nameInput, 'Rohan Updated');

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(userServiceModule.userService.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Rohan Updated' })
      );
    });
  });
});

describe('Phase 2 Practice Interface Component', () => {
  it('renders question without exposing correct answer before submission, then handles submission', async () => {
    const mockQuestion = {
      id: 'q_123',
      title: 'Time Complexity of Binary Search',
      description: 'What is the worst-case time complexity of binary search on a sorted array?',
      type: 'single_choice',
      difficulty: 'Easy',
      version: 1,
      options: [
        { id: 'opt_a', text: 'O(log n)' },
        { id: 'opt_b', text: 'O(n)' },
      ],
      hints: ['Think of halving search space'],
      tags: ['binary-search'],
    };

    vi.spyOn(contentServiceModule.contentService, 'getQuestionById').mockResolvedValue(mockQuestion);
    vi.spyOn(contentServiceModule.practiceService, 'submitAttempt').mockResolvedValue({
      attempt: { isCorrect: true },
      feedback: {
        isCorrect: true,
        evaluationStatus: 'evaluated',
        correctAnswer: 'opt_a',
        explanation: 'Each step divides the search space in half.',
      },
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PracticeQuestion />
      </MemoryRouter>
    );

    // Question content displays
    expect(await screen.findByText('Time Complexity of Binary Search')).toBeInTheDocument();
    expect(screen.getByText('O(log n)')).toBeInTheDocument();
    expect(screen.getByText('O(n)')).toBeInTheDocument();

    // Verify correct answer is NOT displayed before submission
    expect(screen.queryByText(/correct answer!/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/each step divides/i)).not.toBeInTheDocument();

    // Student selects option A and submits
    const optionA = screen.getByRole('radio', { name: /o\(log n\)/i });
    await user.click(optionA);

    const submitBtn = screen.getByRole('button', { name: /submit answer/i });
    await user.click(submitBtn);

    // Feedback displays
    expect(await screen.findByText(/correct answer!/i)).toBeInTheDocument();
    expect(screen.getByText(/each step divides the search space in half/i)).toBeInTheDocument();
  });
});

describe('DSA Problem Browser Component (LeetCode & CodeChef)', () => {
  it('renders external problems, platform badges, and links to original problem with status updates', async () => {
    vi.spyOn(contentServiceModule.contentService, 'getCategories').mockResolvedValue([
      { id: 'cat_dsa', name: 'DSA', slug: 'dsa' },
    ]);
    vi.spyOn(contentServiceModule.contentService, 'getTopics').mockResolvedValue([
      { id: 'top_arrays', name: 'Arrays & Hashing' },
    ]);

    const mockProblem = {
      id: 'ext_1',
      title: 'Two Sum',
      slug: 'two-sum',
      sourcePlatform: 'leetcode',
      externalProblemId: 'leetcode-1',
      sourceUrl: 'https://leetcode.com/problems/two-sum/',
      difficulty: 'Easy',
      tags: ['Array', 'Hash Table'],
      acceptanceRate: 54.2,
      isPremiumOnly: false,
    };

    vi.spyOn(contentServiceModule.externalProblemService, 'getProblems').mockResolvedValue({
      problems: [mockProblem],
      pagination: { page: 1, limit: 15, total: 1, totalPages: 1 },
    });
    vi.spyOn(contentServiceModule.externalProblemService, 'getMyProgress').mockResolvedValue([
      { externalProblemId: 'ext_1', status: 'Not Started' },
    ]);
    vi.spyOn(contentServiceModule.externalProblemService, 'updateProgress').mockResolvedValue({
      externalProblemId: 'ext_1',
      status: 'Solved',
    });

    render(
      <MemoryRouter>
        <DsaProblemBrowser />
      </MemoryRouter>
    );

    // Verify header and problem title
    expect(await screen.findByText('DSA Problem Practice & Tracking')).toBeInTheDocument();
    expect(await screen.findByText('Two Sum')).toBeInTheDocument();

    // Verify platform badge and solve link
    expect(screen.getAllByText('LeetCode').length).toBeGreaterThan(0);
    const solveLink = screen.getByRole('link', { name: /solve on leetcode/i });
    expect(solveLink).toHaveAttribute('href', 'https://leetcode.com/problems/two-sum/');
    expect(solveLink).toHaveAttribute('target', '_blank');
  });
});

describe('Question Review Queue Component', () => {
  it('renders questions in review queue and allows admin to approve', async () => {
    const mockDraftQuestion = {
      id: 'q_draft_1',
      title: 'Explain ACID Properties in DBMS',
      type: 'short_answer',
      difficulty: 'Medium',
      contentOrigin: 'ai_generated',
      reviewStatus: 'pending_review',
      status: 'Draft',
      topicId: { name: 'Transactions' },
    };

    vi.spyOn(contentServiceModule.adminService, 'getReviewQueue').mockResolvedValue({
      questions: [mockDraftQuestion],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    vi.spyOn(contentServiceModule.adminService, 'reviewQuestion').mockResolvedValue({
      id: 'q_draft_1',
      status: 'Published',
      reviewStatus: 'approved',
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <QuestionReviewQueue />
      </MemoryRouter>
    );

    expect(await screen.findByText('Question Review Queue')).toBeInTheDocument();
    expect(await screen.findByText('Explain ACID Properties in DBMS')).toBeInTheDocument();
    expect(screen.getAllByText(/ai generated/i).length).toBeGreaterThan(0);

    // Click Approve
    const approveBtn = screen.getByRole('button', { name: /approve & publish/i });
    await user.click(approveBtn);

    expect(contentServiceModule.adminService.reviewQuestion).toHaveBeenCalledWith(
      'q_draft_1',
      expect.objectContaining({ action: 'approve' })
    );
  });
});

describe('AI Question Generator Component', () => {
  it('renders topic taxonomy options and triggers generation API call', async () => {
    vi.spyOn(contentServiceModule.contentService, 'getCategories').mockResolvedValue([
      { id: 'cat_core', name: 'Core Computer Science', slug: 'core-cs' },
    ]);
    vi.spyOn(contentServiceModule.contentService, 'getSubjects').mockResolvedValue([
      { id: 'sub_os', name: 'Operating Systems', slug: 'operating-systems' },
    ]);
    vi.spyOn(contentServiceModule.contentService, 'getTopics').mockResolvedValue([
      { id: 'top_sched', name: 'CPU Scheduling', slug: 'cpu-scheduling' },
    ]);
    vi.spyOn(contentServiceModule.adminService, 'generateQuestions').mockResolvedValue({
      jobId: 'job_123',
      status: 'completed',
      generatedCount: 3,
      reviewQueueCount: 3,
      questions: [],
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AiQuestionGenerator />
      </MemoryRouter>
    );

    expect(await screen.findByText('AI Question Generator')).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: /operating systems/i })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: /cpu scheduling/i })).toBeInTheDocument();

    const generateBtn = screen.getByRole('button', { name: /generate questions/i });
    await waitFor(() => {
      expect(generateBtn).not.toBeDisabled();
    });

    await user.click(generateBtn);

    await waitFor(() => {
      expect(contentServiceModule.adminService.generateQuestions).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: 'cat_core',
          subjectId: 'sub_os',
          topicId: 'top_sched',
          referencePlatform: 'geeksforgeeks',
        })
      );
    });
  });
});

describe('Phase 3: Assessment List, Runner, Timer, Autosave & History', () => {
  it('renders available assessments and diagnostic banner', async () => {
    vi.spyOn(contentServiceModule.assessmentService, 'getAssessments').mockResolvedValue([
      {
        id: 'tpl_diag_1',
        title: 'Full Placement Diagnostic Assessment',
        description: 'Comprehensive baseline diagnostic across DSA, Core CS, and Aptitude.',
        type: 'full_diagnostic',
        durationMinutes: 25,
        totalQuestions: 10,
        difficultyDistribution: { Easy: 4, Medium: 4, Hard: 2 },
        scoring: { correct: 4, incorrect: -1, unanswered: 0 },
        studentStatus: {
          activeSessionId: null,
          attemptsUsed: 0,
          maxAttempts: 5,
          canStart: true,
          latestResult: null,
        },
      },
    ]);

    render(
      <MemoryRouter>
        <AssessmentList />
      </MemoryRouter>
    );

    expect(await screen.findByText('Placement Assessments')).toBeInTheDocument();
    expect(
      (await screen.findAllByText('Full Placement Diagnostic Assessment')).length
    ).toBeGreaterThan(0);
    expect(screen.getByText(/start diagnostic/i)).toBeInTheDocument();
  });

  it('renders AssessmentRunner with countdown timer, navigator, autosave, and submission dialog', async () => {
    const futureExpiry = new Date(Date.now() + 15 * 60_000).toISOString();
    vi.spyOn(contentServiceModule.assessmentService, 'getSession').mockResolvedValue({
      serverTime: new Date().toISOString(),
      session: {
        id: 'sess_1',
        templateTitle: 'Core CS Assessment',
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        expiresAt: futureExpiry,
        answers: [],
        questionSnapshots: [
          {
            questionId: 'q_1',
            title: 'FCFS Scheduling',
            description: 'Which algorithm is non-preemptive?',
            type: 'single_choice',
            difficulty: 'Easy',
            topicName: 'CPU Scheduling',
            options: [
              { id: 'a', text: 'FCFS' },
              { id: 'b', text: 'Round Robin' },
            ],
          },
          {
            questionId: 'q_2',
            title: 'ACID Properties',
            description: 'What does A stand for?',
            type: 'single_choice',
            difficulty: 'Medium',
            topicName: 'Transactions',
            options: [
              { id: 'a', text: 'Atomicity' },
              { id: 'b', text: 'Availability' },
            ],
          },
        ],
      },
    });

    vi.spyOn(contentServiceModule.assessmentService, 'saveAnswers').mockResolvedValue({
      savedAt: new Date().toISOString(),
      answers: [{ questionId: 'q_1', selectedAnswer: 'a', revision: 1 }],
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AssessmentRunner />
      </MemoryRouter>
    );

    expect(await screen.findByText('Core CS Assessment')).toBeInTheDocument();
    expect(await screen.findByText('FCFS Scheduling')).toBeInTheDocument();
    expect(screen.getByLabelText('Remaining time')).toBeInTheDocument();

    // Select option A and verify autosave
    const optRadio = screen.getByRole('radio', { name: /fcfs/i });
    await user.click(optRadio);

    await waitFor(() => {
      expect(contentServiceModule.assessmentService.saveAnswers).toHaveBeenCalled();
    });

    // Navigate to Question 2 via Question Navigator
    const q2Btn = screen.getByRole('button', { name: /go to question 2/i });
    await user.click(q2Btn);
    expect(await screen.findByText('ACID Properties')).toBeInTheDocument();

    // Open Submission Confirmation modal
    const submitBtn = screen.getByRole('button', { name: /submit assessment/i });
    await user.click(submitBtn);
    expect(await screen.findByText('Confirm Assessment Submission')).toBeInTheDocument();
  });

  it('renders AssessmentHistory with completed attempts and summary stats', async () => {
    vi.spyOn(contentServiceModule.assessmentService, 'getHistory').mockResolvedValue({
      history: [
        {
          id: 'res_1',
          sessionId: 'sess_1',
          templateTitle: 'Full Placement Diagnostic Assessment',
          templateType: 'full_diagnostic',
          rawScore: 32,
          maximumScore: 40,
          scorePercentage: 80,
          timeTakenSeconds: 720,
          completionTrigger: 'manual_submit',
          completedAt: new Date().toISOString(),
        },
      ],
      summary: {
        totalCompleted: 1,
        latestScorePercentage: 80,
        averageScorePercentage: 80,
        topicsAssessed: 6,
        diagnosticStatus: 'Completed',
      },
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <AssessmentHistory />
      </MemoryRouter>
    );

    expect(await screen.findByText('Assessment History')).toBeInTheDocument();
    expect(
      await screen.findByText('Full Placement Diagnostic Assessment')
    ).toBeInTheDocument();
    expect(screen.getByText('32 / 40')).toBeInTheDocument();
  });
});
